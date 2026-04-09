import { Router, Request, Response } from 'express';

const router = Router();

// GET /shipments/:id/track — aggregated tracking view for a shipment
router.get('/:id/track', async (req: Request, res: Response) => {
  res.json({
    shipmentId: req.params.id,
    note: 'Use Socket.IO ws://<host>:4003 — emit subscribe:shipment with shipmentId for live position stream.',
    wsEvent: 'position',
    historyEndpoint: `/positions/history/${req.params.id}`,
    statsEndpoint:   `/positions/stats/${req.params.id}`,
    liveEndpoint:    `/positions/live`,
  });
});

export default router;
