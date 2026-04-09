#!/usr/bin/env node
'use strict';
/**
 * TransportOS — Seed Sample Data
 * Inserts demo vendors, inventory, orders, shipments, invoices
 * Usage: npm run db:seed
 */
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const G = '\x1b[32m', R = '\x1b[31m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';
const TENANT = '00000000-0000-0000-0000-000000000001';
const ADMIN  = '00000000-0000-0000-0000-000000000010';

const db = new Client({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER||'logistics'}:${process.env.POSTGRES_PASSWORD||'secret'}@${process.env.POSTGRES_HOST||'127.0.0.1'}:${process.env.POSTGRES_PORT||5432}/${process.env.POSTGRES_DB||'logistics'}`
});

async function seed() {
  await db.connect();
  console.log(`\n${B}${C}TransportOS — Seeding sample data${X}\n`);

  // Vendors
  console.log(`${C}[vendors]${X}...`);
  const vendors = [
    ['Tata Motors Ltd',       '27AABCT1234F1ZV','logistics@tata.com',    '+91-22-6665-8282','Mumbai, Maharashtra',   30, 4.5],
    ['Reliance Industries',   '27AAACR1234G1ZX','supply@ril.com',         '+91-22-3555-5000','Mumbai, Maharashtra',   45, 4.2],
    ['Infosys Logistics',     '29AABCI1234H1ZY','vendors@infosys.com',    '+91-80-2852-0261','Bangalore, Karnataka',  30, 4.7],
    ['Mahindra & Mahindra',   '27AABCM1234I1ZW','procurement@mahindra.com','+91-22-2490-1441','Pune, Maharashtra',   60, 4.3],
    ['Asian Paints Ltd',      '27AABCA1234J1ZV','supply@asianpaints.com', '+91-22-6218-1000','Mumbai, Maharashtra',   30, 3.9],
    ['HCL Technologies',      '29AABCH1234K1ZU','logistics@hcl.com',      '+91-120-432-6000','Noida, UP',            30, 4.1],
    ['L&T Logistics',         '27AABCL1234L1ZT','supply@lt.com',          '+91-22-6752-5656','Mumbai, Maharashtra',   45, 4.4],
    ['Wipro Ltd',             '29AABCW1234M1ZS','vendors@wipro.com',      '+91-80-2844-0011','Bangalore, Karnataka',  30, 4.0],
  ];
  for (const [n,g,e,p,a,t,r] of vendors) {
    await db.query(
      `INSERT INTO vendors (tenant_id,name,gstin,email,phone,address,payment_terms,rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT,n,g,e,p,a,t,r]
    );
  }
  console.log(`  ${G}✔${X} ${vendors.length} vendors`);

  // Warehouse lookup
  const { rows: [wh] } = await db.query(`SELECT id FROM warehouses WHERE tenant_id=$1 AND city='Mumbai' LIMIT 1`, [TENANT]);

  // Inventory
  console.log(`${C}[inventory]${X}...`);
  const items = [
    ['SKU-00123','Palletized Cargo Type A', 4200,'Units', 200.00,100],
    ['SKU-00124','Cold Chain Package B',     850, 'Cases', 250.00, 50],
    ['SKU-00125','Hazmat Drums C',             0, 'Drums', 800.00, 20],
    ['SKU-00126','Electronics Batch D',     1100, 'Boxes',4000.00,200],
    ['SKU-00127','Textile Roll E',           320, 'Rolls', 200.00, 80],
    ['SKU-00128','Auto Parts Kit F',          60, 'Sets',  500.00, 30],
    ['SKU-00129','Pharma Pack G',            500, 'Cartons',350.00,100],
    ['SKU-00130','FMCG Bundle H',           2400, 'Units',  45.00,500],
  ];
  for (const [sku,name,qty,unit,cost,reorder] of items) {
    await db.query(
      `INSERT INTO inventory (tenant_id,sku,name,qty,unit,warehouse_id,unit_cost,reorder_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT,sku,name,qty,unit,wh?.id||null,cost,reorder]
    );
  }
  console.log(`  ${G}✔${X} ${items.length} inventory items`);

  // Orders
  console.log(`${C}[orders]${X}...`);
  const orders = [
    ['ORD-19283','Tata Motors',    'Mumbai',   'Delhi',     42, 824000, 'CONFIRMED', '2025-04-09'],
    ['ORD-19284','Reliance Retail','Bangalore','Chennai',    8,  144500, 'IN_TRANSIT','2025-04-08'],
    ['ORD-19285','Infosys',        'Pune',     'Hyderabad', 15, 320000, 'PENDING',   '2025-04-10'],
    ['ORD-19286','HCL Technologies','Kolkata', 'Ahmedabad',200,2250000, 'DELIVERED', '2025-04-06'],
    ['ORD-19287','Wipro Ltd',      'Chennai',  'Surat',      5,  68500, 'CANCELLED', '2025-04-07'],
    ['ORD-19288','L&T Logistics',  'Delhi',    'Bangalore', 88,1560000, 'CONFIRMED', '2025-04-11'],
    ['ORD-19289','Asian Paints',   'Mumbai',   'Jaipur',    34, 410000, 'IN_TRANSIT','2025-04-09'],
    ['ORD-19290','Mahindra',       'Pune',     'Kolkata',   72,1820000, 'CONFIRMED', '2025-04-12'],
  ];
  for (const [num,cust,orig,dest,items_cnt,val,status,sla] of orders) {
    await db.query(
      `INSERT INTO orders (tenant_id,order_number,customer_name,origin_city,dest_city,total_items,total_value,status,sla_date,priority,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'standard',$10) ON CONFLICT DO NOTHING`,
      [TENANT,num,cust,orig,dest,items_cnt,val,status,sla,ADMIN]
    );
  }
  console.log(`  ${G}✔${X} ${orders.length} orders`);

  // Shipments
  console.log(`${C}[shipments]${X}...`);
  const shipments = [
    ['SHP-2847','BlueDart',  'Air', 'TN-09-AB-3421','DEV-001','Mumbai',   'Delhi',    'IN_TRANSIT'],
    ['SHP-2848','DTDC',      'Road','DL-01-CA-5892','DEV-002','Chennai',  'Kolkata',  'IN_TRANSIT'],
    ['SHP-2849','Gati',      'Road','KA-05-MN-8823','DEV-003','Bangalore','Pune',     'DELAYED'   ],
    ['SHP-2850','FedEx',     'Air', 'MH-12-GH-4411','DEV-004','Delhi',   'Hyderabad','IN_TRANSIT'],
    ['SHP-2851','Ecom Express','Road',null,          null,     'Surat',   'Jaipur',   'DELIVERED' ],
    ['SHP-2852','Delhivery', 'Rail',null,            null,     'Pune',    'Chennai',  'IN_TRANSIT'],
    ['SHP-2853','BlueDart',  'Air', 'TN-09-XY-9901','DEV-005','Mumbai',  'Bangalore','IN_TRANSIT'],
    ['SHP-2854','CONCOR',    'Rail',null,            null,     'Delhi',   'Kolkata',  'IN_TRANSIT'],
  ];
  for (const [num,carrier,mode,veh,dev,orig,dest,status] of shipments) {
    await db.query(
      `INSERT INTO shipments (tenant_id,shipment_number,carrier_name,transport_mode,vehicle_reg,device_id,origin_city,dest_city,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [TENANT,num,carrier,mode,veh,dev,orig,dest,status]
    );
  }
  console.log(`  ${G}✔${X} ${shipments.length} shipments`);

  // Invoices
  console.log(`${C}[invoices]${X}...`);
  const invoices = [
    ['INV-2025-0481','Tata Motors Ltd',       482500, 86850,  569350, 'PAID',    '2025-05-15'],
    ['INV-2025-0480','Reliance Industries',  1240000,223200, 1463200, 'PENDING', '2025-05-10'],
    ['INV-2025-0479','Infosys Logistics',     218750, 39375,  258125, 'OVERDUE', '2025-04-30'],
    ['INV-2025-0478','Mahindra & Mahindra',   895000,161100, 1056100, 'PENDING', '2025-05-20'],
    ['INV-2025-0477','Asian Paints Ltd',      162300, 29214,  191514, 'PAID',    '2025-04-25'],
    ['INV-2025-0476','HCL Technologies',      344800, 62064,  406864, 'OVERDUE', '2025-04-28'],
    ['INV-2025-0475','L&T Logistics',         980000,176400, 1156400, 'PENDING', '2025-05-25'],
  ];
  for (const [num,cust,sub,tax,total,status,due] of invoices) {
    await db.query(
      `INSERT INTO invoices (tenant_id,invoice_number,customer_name,subtotal,tax_amount,total_amount,currency,status,due_date) VALUES ($1,$2,$3,$4,$5,$6,'INR',$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT,num,cust,sub,tax,total,status,due]
    );
  }
  console.log(`  ${G}✔${X} ${invoices.length} invoices`);

  // Sample users
  console.log(`${C}[users]${X}...`);
  const users = [
    ['arjun.sharma@transportos.com', 'Arjun Sharma',   'OPS_MANAGER'  ],
    ['priya.nair@transportos.com',   'Priya Nair',     'LOGISTICS_EXEC'],
    ['deepa.menon@transportos.com',  'Deepa Menon',    'FINANCE_ADMIN' ],
    ['ravi.kumar@transportos.com',   'Ravi Kumar',     'ANALYST'       ],
  ];
  for (const [email,name,role] of users) {
    await db.query(
      `INSERT INTO users (tenant_id,email,name,role,active) VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT DO NOTHING`,
      [TENANT,email,name,role]
    );
  }
  console.log(`  ${G}✔${X} ${users.length} users`);

  await db.end();
  console.log(`\n${G}${B}Sample data seeded!${X}`);
  console.log(`Login: ${C}admin@transportos.com${X} / any password`);
  console.log(`Run:   ${C}npm run dev${X}  then open  ${C}http://localhost:3000${X}\n`);
}

seed().catch(err => {
  console.error(`${R}Seed failed:${X}`, err.message);
  db.end().catch(() => {});
  process.exit(1);
});
