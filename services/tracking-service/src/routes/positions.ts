import { Router, Request, Response } from 'express';
import { GpsPosition } from '../models/GpsPosition';
import { io } from '../index';
import { redis } from '../index';

const router = Router();

/**
 * POST /positions/ingest
 * HTTP fallback for devices that cannot use MQTT (e.g. mobile SDK, web).
 * Accepts same payload as MQTT JSON topic.
 */
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const { deviceId, shipmentId, vehicleId, lat, lng, altitude = 0,
            speed = 0, heading = 0, accuracy = 0, satellites = 0,
            temp, fuelPct, engineOn, shockG, odometer, ts } = req.body;

    if (!deviceId || !lat || !lng) {
      return res.status(400).json({ error: 'deviceId, lat and lng are required' });
    }

    const timestamp = ts ? new Date(ts) : new Date();

    const pos = await GpsPosition.create({
      deviceId, shipmentId, vehicleId,
      lat, lng, altitude, speed, heading, accuracy, satellites,
      timestamp, temp, fuelPct, engineOn, shockG, odometer,
    });

    // Broadcast via Socket.IO
    const event = { deviceId, shipmentId, vehicleId, lat, lng, speed, heading, temp, fuelPct, engineOn, ts: timestamp };
    io.to(`shipment:${shipmentId}`).emit('position', event);
    io.to('tracking:all').emit('position', event);

    // Cache latest
    await redis.setex(`track:live:${deviceId}`, 300, JSON.stringify(event));

    res.status(201).json({ ok: true, id: pos._id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /positions/live
 * Returns the latest position of every active device (from Redis cache).
 */
router.get('/live', async (_req: Request, res: Response) => {
  const keys = await redis.keys('track:live:*');
  const positions = [];
  for (const key of keys) {
    const val = await redis.get(key);
    if (val) positions.push(JSON.parse(val));
  }
  res.json({ data: positions, total: positions.length });
});

/**
 * GET /positions/live/:deviceId
 * Latest position of a specific device.
 */
router.get('/live/:deviceId', async (req: Request, res: Response) => {
  const val = await redis.get(`track:live:${req.params.deviceId}`);
  if (!val) return res.status(404).json({ error: 'No live position found' });
  res.json(JSON.parse(val));
});

/**
 * GET /positions/history/:shipmentId
 * Full GPS trail for a shipment (paginated).
 */
router.get('/history/:shipmentId', async (req: Request, res: Response) => {
  const { from, to, limit = '500', page = '1' } = req.query as Record<string, string>;
  const filter: Record<string, any> = { shipmentId: req.params.shipmentId };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to)   filter.timestamp.$lte = new Date(to);
  }
  const lim  = Math.min(parseInt(limit), 2000);
  const skip = (parseInt(page) - 1) * lim;

  const [data, total] = await Promise.all([
    GpsPosition.find(filter).sort({ timestamp: 1 }).skip(skip).limit(lim).lean(),
    GpsPosition.countDocuments(filter),
  ]);

  res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / lim) });
});

/**
 * GET /positions/stats/:shipmentId
 * Aggregate stats: distance, avg speed, max speed, idle time.
 */
router.get('/stats/:shipmentId', async (req: Request, res: Response) => {
  const positions = await GpsPosition.find({ shipmentId: req.params.shipmentId })
    .sort({ timestamp: 1 })
    .select('lat lng speed timestamp')
    .lean();

  if (positions.length < 2) return res.json({ distanceKm: 0, avgSpeed: 0, maxSpeed: 0, idleMinutes: 0 });

  let distKm = 0;
  let totalSpeed = 0;
  let maxSpeed = 0;
  let idleSeconds = 0;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];

    // Haversine distance
    const R = 6371;
    const dLat = toRad(curr.lat - prev.lat);
    const dLng = toRad(curr.lng - prev.lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(prev.lat)) * Math.cos(toRad(curr.lat)) * Math.sin(dLng/2)**2;
    distKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    totalSpeed += curr.speed;
    if (curr.speed > maxSpeed) maxSpeed = curr.speed;

    const dtSec = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
    if (curr.speed < 5 && dtSec < 600) idleSeconds += dtSec;
  }

  res.json({
    distanceKm:   Math.round(distKm * 10) / 10,
    avgSpeed:     Math.round(totalSpeed / positions.length),
    maxSpeed:     Math.round(maxSpeed),
    idleMinutes:  Math.round(idleSeconds / 60),
    totalPoints:  positions.length,
  });
});

function toRad(deg: number) { return deg * Math.PI / 180; }

export default router;
