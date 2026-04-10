import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();

// ─────────────────────────────────────────────────────
// ✅ Middleware
// ─────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: '*',
  credentials: true,
}));

// Rate limiting
app.use('/auth', rateLimit({ windowMs: 60_000, max: 30 }));
app.use(rateLimit({ windowMs: 60_000, max: 2000 }));

app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────────────────
// ✅ Logging Middleware
// ─────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────
// ✅ Health Check
// ─────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    time: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────
// ✅ JWT Middleware
// ─────────────────────────────────────────────────────
const JWT_SECRET =
  process.env.JWT_SECRET ?? 'transportos_secret_change_in_production!!';

function verifyJWT(req: any, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─────────────────────────────────────────────────────
// ✅ Service Resolver (Render + Local)
// ─────────────────────────────────────────────────────
const svc = (envKey: string, defaultPort: number): string => {
  const url = process.env[envKey];
  if (url) return url;

  const host = process.env.SERVICE_HOST ?? 'http://127.0.0.1';
  return `${host}:${defaultPort}`;
};

// 🔥 Debug log (VERY IMPORTANT)
console.log("IDENTITY SERVICE URL:", svc('IDENTITY_SERVICE_URL', 4005));

// ─────────────────────────────────────────────────────
// ✅ Service Routes
// ─────────────────────────────────────────────────────
const ROUTES: Record<string, string> = {
  '/erp':           svc('ERP_SERVICE_URL',       4001),
  '/transport':     svc('TRANSPORT_SERVICE_URL', 4002),
  '/tracking':      svc('TRACKING_SERVICE_URL',  4003),
  '/ai':            svc('AI_SERVICE_URL',        8001),
  '/identity':      svc('IDENTITY_SERVICE_URL',  4005),
  '/finance':       svc('FINANCE_SERVICE_URL',   4006),
  '/orders':        svc('ORDER_SERVICE_URL',     4007),
  '/notifications': svc('NOTIFY_SERVICE_URL',    4008),
  '/integrations':  svc('INTEGRATE_SERVICE_URL', 4009),
  '/analytics':     svc('ANALYTICS_SERVICE_URL', 4010),
};

// ─────────────────────────────────────────────────────
// ✅ AUTH ROUTE (PUBLIC) 🔥 CRITICAL
// ─────────────────────────────────────────────────────
app.use('/auth', createProxyMiddleware({
  target: svc('IDENTITY_SERVICE_URL', 4005),
  changeOrigin: true,

  // Remove /auth prefix
  pathRewrite: {
    '^/auth': '',
  },

  timeout: 15000,
  proxyTimeout: 15000,
  secure: false,

  on: {
    error: (err: any, req: Request, res: Response) => {
      console.error('[GW] Identity service error:', err.message);
      res.status(503).json({
        error: 'Identity service unavailable',
      });
    }
  }
}));

// ─────────────────────────────────────────────────────
// ✅ PROTECTED ROUTES
// ─────────────────────────────────────────────────────
for (const [path, target] of Object.entries(ROUTES)) {
  app.use(path, verifyJWT, createProxyMiddleware({
    target,
    changeOrigin: true,

    pathRewrite: {
      [`^${path}`]: '',
    },

    timeout: 15000,
    proxyTimeout: 15000,
    secure: false,

    on: {
      error: (err: any, req: Request, res:any)=>{
        console.error(`[GW] ${path} error:`, err.message);
        res.status(503).json({
          error: `Service ${path} unavailable`,
        });
      }
    }
  }));
}

// ─────────────────────────────────────────────────────
// ✅ START SERVER
// ─────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[36m[API-GATEWAY]\x1b[0m running on port ${PORT}`);
  console.log(`Routes: ${Object.keys(ROUTES).join(', ')}`);
});