import { Router, Response } from 'express';
const router = Router();

router.get('/', async (req: any, res: Response) => {
  const { rows } = await req.db.query('SELECT * FROM warehouses ORDER BY name');
  res.json({ data: rows, total: rows.length });
});

router.post('/', async (req: any, res: Response) => {
  const { name, city, state, pincode, capacity_sqm, type } = req.body;
  const { rows } = await req.db.query(
    `INSERT INTO warehouses (name,city,state,pincode,capacity_sqm,type)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, city, state, pincode, capacity_sqm, type ?? 'general']
  );
  res.status(201).json(rows[0]);
});

export default router;
