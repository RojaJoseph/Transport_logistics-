/**
 * Socket.IO Service
 * Manages rooms, live position subscriptions, and Redis pub/sub fan-out.
 * Enables horizontal scaling: any pod receives MQTT data → Redis pub →
 * all pods fan-out to their connected clients.
 */

import { Server as SocketIO, Socket } from 'socket.io';
import Redis from 'ioredis';

export function setupSocketHandlers(io: SocketIO, redis: Redis, redisSub: Redis) {
  // Subscribe to Redis channel for cross-pod fan-out
  redisSub.subscribe('tracking:position', (err) => {
    if (err) console.error('[socket] Redis subscribe error:', err);
  });

  redisSub.on('message', (_channel: string, message: string) => {
    try {
      const pos = JSON.parse(message);
      // Re-broadcast to Socket.IO rooms on THIS pod
      io.to(`shipment:${pos.shipmentId}`).emit('position', pos);
      io.to(`vehicle:${pos.vehicleId}`).emit('position', pos);
      io.to('tracking:all').emit('position', pos);
    } catch { /* ignore malformed */ }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // ── Subscribe to a specific shipment ──────────────────────
    socket.on('subscribe:shipment', async (shipmentId: string) => {
      socket.join(`shipment:${shipmentId}`);
      console.log(`[socket] ${socket.id} → room shipment:${shipmentId}`);

      // Send the last known position immediately
      const cached = await redis.get(`track:live:${shipmentId}`);
      if (cached) socket.emit('position', JSON.parse(cached));
    });

    // ── Subscribe to a specific vehicle ───────────────────────
    socket.on('subscribe:vehicle', async (vehicleId: string) => {
      socket.join(`vehicle:${vehicleId}`);
      const cached = await redis.get(`track:live:${vehicleId}`);
      if (cached) socket.emit('position', JSON.parse(cached));
    });

    // ── Subscribe to ALL live positions (global map) ──────────
    socket.on('subscribe:all', async () => {
      socket.join('tracking:all');

      // Send all currently cached live positions
      const keys = await redis.keys('track:live:*');
      for (const key of keys) {
        const val = await redis.get(key);
        if (val) socket.emit('position', JSON.parse(val));
      }
    });

    // ── Unsubscribe ───────────────────────────────────────────
    socket.on('unsubscribe:shipment', (id: string) => socket.leave(`shipment:${id}`));
    socket.on('unsubscribe:vehicle',  (id: string) => socket.leave(`vehicle:${id}`));
    socket.on('unsubscribe:all',      ()           => socket.leave('tracking:all'));

    socket.on('disconnect', () => {
      console.log(`[socket] Client disconnected: ${socket.id}`);
    });
  });
}
