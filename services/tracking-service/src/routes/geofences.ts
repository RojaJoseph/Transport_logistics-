import { Router, Request, Response } from 'express';
import { Geofence } from '../models/GpsPosition';
import { redis } from '../index';

const router = Router();

// GET /geofences
router.get('/', async (_req: Request, res: Response) => {
  const fences = await Geofence.find().lean();
  res.json({ data: fences, total: fences.length });
});

// POST /geofences — create a new geofence zone
router.post('/', async (req: Request, res: Response) => {
  const { name, type, center, radiusMetres, polygon, alertOnEnter = true, alertOnExit = true, assignedTo = [] } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  if (type === 'circle' && (!center || !radiusMetres)) return res.status(400).json({ error: 'circle requires center + radiusMetres' });
  if (type === 'polygon' && (!polygon || polygon.length < 3)) return res.status(400).json({ error: 'polygon requires ≥3 points' });

  const fence = await Geofence.create({ name, type, center, radiusMetres, polygon, alertOnEnter, alertOnExit, assignedTo, active: true });
  res.status(201).json(fence);
});

// PATCH /geofences/:id/assign
router.patch('/:id/assign', async (req: Request, res: Response) => {
  const { ids } = req.body;   // array of shipmentId or vehicleId
  const fence = await Geofence.findByIdAndUpdate(req.params.id, { $addToSet: { assignedTo: { $each: ids } } }, { new: true });
  if (!fence) return res.status(404).json({ error: 'Geofence not found' });
  res.json(fence);
});

// DELETE /geofences/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await Geofence.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

// GET /geofences/alerts/recent
router.get('/alerts/recent', async (_req: Request, res: Response) => {
  const raw = await redis.lrange('geo:alerts:recent', 0, 49);
  res.json({ data: raw.map(r => JSON.parse(r)) });
});

export default router;
