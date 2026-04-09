import { Router, Response } from 'express';
import { z } from 'zod';
const router = Router();

const VendorSchema = z.object({
  name:         z.string().min(2),
  gstin:        z.string().length(15),
  email:        z.string().email(),
  phone:        z.string(),
  address:      z.string(),
  payment_terms:z.number().int().default(30),
  rating:       z.number().min(0).max(5).default(3),
  active:       z.boolean().default(true),
});

router.get('/', async (req: any, res: Response) => {
  const { rows } = await req.db.query('SELECT * FROM vendors ORDER BY name');
  res.json({ data: rows, total: rows.length });
});

router.get('/:id', async (req: any, res: Response) => {
  const { rows } = await req.db.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
  res.json(rows[0]);
});

router.post('/', async (req: any, res: Response) => {
  const parsed = VendorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const { rows } = await req.db.query(
    `INSERT INTO vendors (name,gstin,email,phone,address,payment_terms,rating,active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.name,d.gstin,d.email,d.phone,d.address,d.payment_terms,d.rating,d.active]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req: any, res: Response) => {
  const fields = Object.entries(req.body).filter(([k]) =>
    ['name','email','phone','address','payment_terms','rating','active'].includes(k)
  );
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  const sets = fields.map(([k], i) => `${k} = $${i+2}`).join(', ');
  const vals = fields.map(([, v]) => v);
  const { rows } = await req.db.query(
    `UPDATE vendors SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id, ...vals]
  );
  if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
  res.json(rows[0]);
});

export default router;
