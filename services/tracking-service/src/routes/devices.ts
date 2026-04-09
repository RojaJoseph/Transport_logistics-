import { Router, Request, Response } from 'express';
import { Device } from '../models/GpsPosition';
import { z } from 'zod';

const router = Router();

const DeviceSchema = z.object({
  deviceId:   z.string().min(4),
  imei:       z.string().min(15).max(17),
  type:       z.enum(['obd', 'hardwired', 'mobile', 'asset_tracker']).default('hardwired'),
  vehicleId:  z.string().min(2),
  vehicleReg: z.string().min(2),
  shipmentId: z.string().optional(),
  firmware:   z.string().optional(),
  simIccid:   z.string().optional(),
});

// GET /devices — list all registered GPS devices
router.get('/', async (_req: Request, res: Response) => {
  const devices = await Device.find().sort({ lastSeen: -1 }).lean();
  res.json({ data: devices, total: devices.length });
});

// GET /devices/:deviceId
router.get('/:deviceId', async (req: Request, res: Response) => {
  const dev = await Device.findOne({ deviceId: req.params.deviceId }).lean();
  if (!dev) return res.status(404).json({ error: 'Device not found' });
  res.json(dev);
});

// POST /devices — register a new GPS device
router.post('/', async (req: Request, res: Response) => {
  const parsed = DeviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const dev = await Device.create(parsed.data);
  res.status(201).json(dev);
});

// PATCH /devices/:deviceId/assign — assign device to shipment
router.patch('/:deviceId/assign', async (req: Request, res: Response) => {
  const { shipmentId } = req.body;
  if (!shipmentId) return res.status(400).json({ error: 'shipmentId required' });
  const dev = await Device.findOneAndUpdate(
    { deviceId: req.params.deviceId },
    { shipmentId, active: true },
    { new: true }
  );
  if (!dev) return res.status(404).json({ error: 'Device not found' });
  res.json(dev);
});

// PATCH /devices/:deviceId/unassign
router.patch('/:deviceId/unassign', async (req: Request, res: Response) => {
  const dev = await Device.findOneAndUpdate(
    { deviceId: req.params.deviceId },
    { $unset: { shipmentId: '' } },
    { new: true }
  );
  if (!dev) return res.status(404).json({ error: 'Device not found' });
  res.json(dev);
});

// DELETE /devices/:deviceId
router.delete('/:deviceId', async (req: Request, res: Response) => {
  await Device.deleteOne({ deviceId: req.params.deviceId });
  res.status(204).send();
});

export default router;
