import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIO } from 'socket.io';
import mongoose from 'mongoose';
import Redis from 'ioredis';

import { setupMQTT } from './mqtt/mqttBroker';
import { setupSocketHandlers } from './services/socketService';
import positionRoutes from './routes/positions';
import deviceRoutes   from './routes/devices';
import shipmentRoutes from './routes/shipments';
import geofenceRoutes from './routes/geofences';

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────
export const io = new SocketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// ── Redis ─────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL ?? 'redis://redis:6379';
export const redis    = new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
export const redisSub = new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });

redis.connect().catch(()    => console.warn('[tracking] Redis unavailable — live caching disabled'));
redisSub.connect().catch(() => console.warn('[tracking] Redis sub unavailable'));

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet()); app.use(cors()); app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'tracking', ts: new Date().toISOString() })
);
app.use('/positions', positionRoutes);
app.use('/devices',   deviceRoutes);
app.use('/shipments', shipmentRoutes);
app.use('/geofences', geofenceRoutes);

// ── Bootstrap ─────────────────────────────────────────────────────
async function bootstrap() {
  const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://logistics:secret@mongo:27017';
  try {
    await mongoose.connect(MONGO_URL);
    console.log('[tracking] MongoDB connected');
  } catch (err: any) {
    console.warn('[tracking] MongoDB unavailable — GPS history disabled:', err.message);
  }

  setupSocketHandlers(io, redis, redisSub);

  try {
    await setupMQTT(io, redis);
  } catch (err: any) {
    console.warn('[tracking] MQTT unavailable — using HTTP ingest only:', err.message);
  }

  const PORT = Number(process.env.PORT ?? 4003);
  server.listen(PORT, '0.0.0.0', () =>
    console.log(`[tracking-service] Listening on port ${PORT}`)
  );
}

bootstrap().catch(console.error);
