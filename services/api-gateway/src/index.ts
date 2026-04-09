import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();

// ── Trust proxy (nginx / load-balancer in front) ──────────────────
app.set('trust proxy', 1);

// ── CORS — configurable via env for production ────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://frontend:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (health checks, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

app.use('/auth', rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use(rateLimit({ windowMs: 60_000, max: 2000, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));

// ── Logger ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => {
    const c = res.statusCode >= 500 ? '\x1b[31m'
            : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${c}[GW] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - t}ms\x1b[0m`);
  });
  next();
});

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'api-gateway', ts: new Date().toISOString() })
);

// ── JWT guard ─────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET ?? 'change_this_in_production_minimum_64_chars!!!!!!!!!!!!!!!!!!!!!!!';

function verifyJWT(req: any, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid — please log in again' });
  }
}

// ── Service registry — Docker service names ───────────────────────
const ROUTES: Record<string, string> = {
  '/erp':           process.env.SERVICE_ERP       ?? 'http://erp-service:4001',
  '/transport':     process.env.SERVICE_TRANSPORT ?? 'http://transport-service:4002',
  '/tracking':      process.env.SERVICE_TRACKING  ?? 'http://tracking-service:4003',
  '/ai':            process.env.SERVICE_AI        ?? 'http://ai-service:8001',
  '/identity':      process.env.SERVICE_IDENTITY  ?? 'http://identity-service:4005',
  '/finance':       process.env.SERVICE_FINANCE   ?? 'http://finance-service:4006',
  '/orders':        process.env.SERVICE_ORDERS    ?? 'http://order-service:4007',
  '/notifications': process.env.SERVICE_NOTIFY    ?? 'http://notification-service:4008',
  '/integrations':  process.env.SERVICE_INTEGRATE ?? 'http://integration-service:4009',
  '/analytics':     process.env.SERVICE_ANALYTICS ?? 'http://analytics-service:4010',
};

// ── Public: /auth → identity-service ─────────────────────────────
app.use('/auth', createProxyMiddleware({
  target: process.env.SERVICE_IDENTITY ?? 'http://identity-service:4005',
  changeOrigin: true,
  pathRewrite: { '^/auth': '' },
  on: {
    error: (_e: any, _r: any, res: any) =>
      res.status(503).json({ error: 'Identity service unavailable' }),
  },
}));

// ── Protected routes ──────────────────────────────────────────────
for (const [path, target] of Object.entries(ROUTES)) {
  app.use(
    path,
    verifyJWT,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^${path}`]: '' },
      on: {
        error: (_e: any, _r: any, res: any) =>
          res.status(503).json({ error: `Service ${path} unavailable` }),
      },
    })
  );
}

// ── Error handler ─────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[gateway] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal gateway error' });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[36m[api-gateway]\x1b[0m Listening on :${PORT}`);
  console.log(`\x1b[36m[api-gateway]\x1b[0m Routing to ${Object.keys(ROUTES).length} services`);
  console.log(`\x1b[36m[api-gateway]\x1b[0m Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
