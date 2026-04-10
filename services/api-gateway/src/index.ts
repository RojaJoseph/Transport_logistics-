import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();

// ─────────────────────────────────────────
// ✅ Middleware
// ─────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use('/auth', rateLimit({ windowMs: 60_000, max: 30 }));
app.use(rateLimit({ windowMs: 60_000, max: 2000 }));

app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────
// ✅ Logging
// ─────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const color =
      res.statusCode >= 500 ? '\x1b[31m' :
      res.statusCode >= 400 ? '\x1b[33m' :
      '\x1b[32m';

    console.log(
      `${color}[GW] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms\x1b[0m`
    );
  });

  next();
});

// ─────────────────────────────────────────
// ✅ Health Check
// ─────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    time: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────
// ✅ JWT Middleware
// ─────────────────────────────────────────
const JWT_SECRET =
  process.env.JWT_SECRET ?? 'transportos_secret_change_in_production!!';

function verifyJWT(req: any, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─────────────────────────────────────────
// ✅ DEBUG
// ─────────────────────────────────────────
console.log("🔥 IDENTITY SERVICE URL:", process.env.IDENTITY_SERVICE_URL);

// ─────────────────────────────────────────
// ✅ ROUTES
// ─────────────────────────────────────────
const ROUTES: Record<string, string | undefined> = {
  '/erp': process.env.ERP_SERVICE_URL,
  '/transport': process.env.TRANSPORT_SERVICE_URL,
  '/tracking': process.env.TRACKING_SERVICE_URL,
  '/ai': process.env.AI_SERVICE_URL,
  '/finance': process.env.FINANCE_SERVICE_URL,
  '/orders': process.env.ORDER_SERVICE_URL,
  '/notifications': process.env.NOTIFY_SERVICE_URL,
  '/integrations': process.env.INTEGRATE_SERVICE_URL,
  '/analytics': process.env.ANALYTICS_SERVICE_URL,
};

// ─────────────────────────────────────────
// ✅ AUTH ROUTE (CRITICAL FIX)
// ─────────────────────────────────────────
app.use('/auth', createProxyMiddleware({
  target: process.env.IDENTITY_SERVICE_URL || 'https://transportos-identity.onrender.com',

  changeOrigin: true,
  pathRewrite: { '^/auth': '' },

  timeout: 60000,
  proxyTimeout: 60000,
  secure: false,
  xfwd: true,

  on: {
    proxyReq: (proxyReq, req: any) => {
      // 🔥 FIX: forward body
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);

        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }

      console.log('[GW] AUTH → Identity:', req.url);
    },

    proxyRes: (proxyRes) => {
      console.log('[GW] Identity response:', proxyRes.statusCode);
    },

    error: (err: any, req: any, res: any) => {
      console.error('[GW] Identity error:', err.message);

      if (res && typeof res.writeHead === 'function') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Identity service unavailable',
          debug: err.message
        }));
      }
    }
  }
}));

// ─────────────────────────────────────────
// ✅ PROTECTED ROUTES
// ─────────────────────────────────────────
for (const [path, target] of Object.entries(ROUTES)) {

  if (!target) {
    console.warn(`⚠️ Missing ENV for ${path}, skipping...`);
    continue;
  }

  app.use(path, verifyJWT, createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,

    pathRewrite: {
      [`^${path}`]: '',
    },

    timeout: 30000,
    proxyTimeout: 30000,
    secure: false,

    on: {
      error: (err: any, req: any, res: any) => {
        console.error(`❌ ${path} proxy error:`, err.message);

        if (res && typeof res.writeHead === 'function') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Service ${path} unavailable`,
          }));
        }
      }
    }
  }));
}

// ─────────────────────────────────────────
// ✅ START SERVER
// ─────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[36m[API-GATEWAY]\x1b[0m running on port ${PORT}`);
  console.log(`Routes: ${Object.keys(ROUTES).join(', ')}`);
});