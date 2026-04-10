import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use('/auth', rateLimit({ windowMs: 60_000, max: 30 }));
app.use(rateLimit({ windowMs: 60_000, max: 2000 }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => {
    const c = res.statusCode>=500?'\x1b[31m':res.statusCode>=400?'\x1b[33m':'\x1b[32m';
    console.log(`${c}[GW] ${req.method} ${req.url} ${res.statusCode} ${Date.now()-t}ms\x1b[0m`);
  });
  next();
});

app.get('/health', (_req, res) => res.json({ status:'ok', service:'api-gateway', ts:new Date().toISOString() }));

const JWT_SECRET = process.env.JWT_SECRET ?? 'transportos_secret_change_in_production!!';

function verifyJWT(req:any, res:express.Response, next:express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Authorization header' });
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token expired or invalid' }); }
}

// Resolve service URLs — works both locally and on Render
const svc = (envKey: string, defaultPort: number): string => {
  // On Render, each service has its own URL set as an env var
  const url = process.env[envKey];
  if (url) return url;
  // Local fallback
  const host = process.env.SERVICE_HOST ?? 'http://127.0.0.1';
  return `${host}:${defaultPort}`;
};

const ROUTES: Record<string, string> = {
  '/erp':           svc('ERP_SERVICE_URL',       4001),
  '/transport':     svc('TRANSPORT_SERVICE_URL', 4002),
  '/tracking':      svc('TRACKING_SERVICE_URL',  4003),
  '/ai':            svc('AI_SERVICE_URL',         8001),
  '/identity':      svc('IDENTITY_SERVICE_URL',  4005),
  '/finance':       svc('FINANCE_SERVICE_URL',   4006),
  '/orders':        svc('ORDER_SERVICE_URL',      4007),
  '/notifications': svc('NOTIFY_SERVICE_URL',    4008),
  '/integrations':  svc('INTEGRATE_SERVICE_URL', 4009),
  '/analytics':     svc('ANALYTICS_SERVICE_URL', 4010),
};

// Public — auth
app.use('/auth', createProxyMiddleware({
  target: svc('IDENTITY_SERVICE_URL', 4005),
  changeOrigin: true,
  pathRewrite: { '^/auth': '' },
  on: { error: (_e:any, _r:any, res:any) => res.status(503).json({ error: 'Identity service unavailable' }) },
}));

// Protected
for (const [path, target] of Object.entries(ROUTES)) {
  app.use(path, verifyJWT, createProxyMiddleware({
    target, changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    on: { error: (_e:any, _r:any, res:any) => res.status(503).json({ error: `Service ${path} unavailable` }) },
  }));
}

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[36m[api-gateway]\x1b[0m http://0.0.0.0:${PORT}`);
  console.log(`Routes: ${Object.keys(ROUTES).join(', ')}`);
});
