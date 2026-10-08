import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { authRouter, handleGetUser, handleSignUp, handleLogin, handleLogout } from './server/routes/auth.js';
import { authenticate } from './server/auth/jwt.js';
import { assignmentsRouter } from './server/routes/assignments.js';
import { studentRouter } from './server/routes/student.js';
import { registryRouter } from './server/routes/registry.js';
import { healthRouter } from './server/routes/health.js';
import { initRepository } from './server/repository/index.js';
import { loginRateLimiter, signupRateLimiter } from './server/middleware/rateLimiter.js';

// Environment-aware port configuration (Cloud Run / Container dynamic PORT with 3000 local fallback)
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const provider = (process.env.DATABASE_PROVIDER || '').toLowerCase().trim();

  // 1. Conditional Database Initialization (Supabase mode completely decouples from SQLite)
  if (provider === 'supabase') {
    console.log('[SyntaXViva] Supabase provider configured. Bypassing SQLite initialization.');
  } else {
    console.log('[SyntaXViva] Initializing local SQLite database and extensible registries...');
    const { getDatabase } = await import('./server/db/database.js');
    await getDatabase();
    console.log('[SyntaXViva] Local SQLite database initialized successfully.');
  }

  // 2. Initialize Core Application Repository (Supabase PostgreSQL / SQLite)
  console.log('[SyntaXViva] Initializing Core Application Data Repository...');
  await initRepository();

  const app = express();

  // Production Security Headers
  app.use(
    helmet({
      frameguard: false, // Explicitly permit AI Studio preview / multi-origin iframe embedding
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false, // Permit iframe communication and prevent fetch isolation
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "blob:"],
          connectSrc: [
            "'self'",
            "https://*.supabase.co",
            "https://cdn.jsdelivr.net",
            "https://storage.googleapis.com",
            "https://*.googleapis.com",
            "wss:",
            "data:",
          ],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          mediaSrc: ["'self'", "blob:", "data:"],
          workerSrc: ["'self'", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          frameAncestors: ["'self'", "*"],
        },
      },
      hsts: false,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Global CORS & Preflight handling for container / iframe environment
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Explicit static file serving for WASM and ML Models with exact Content-Type headers
  const wasmDir = path.join(process.cwd(), 'public/wasm');
  const modelsDir = path.join(process.cwd(), 'public/models');

  app.use('/wasm', express.static(wasmDir, {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    },
  }));

  app.use('/models', express.static(modelsDir, {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', 'application/octet-stream');
    },
  }));

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Routes (Mounted first)
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/student', studentRouter);
  app.use('/api/mutation-registry', registryRouter);

  // Direct Auth Aliases for root endpoints with targeted rate limiting
  app.get('/user', authenticate, handleGetUser);
  app.get('/api/user', authenticate, handleGetUser);
  app.post('/signup', signupRateLimiter, handleSignUp);
  app.post('/login', loginRateLimiter, handleLogin);
  app.post('/logout', handleLogout);

  // Fallback for API 404
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // Vite middleware in development vs static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Global Express Error Handler (prevents unhandled route errors from crashing server)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[SyntaXViva] Handled Express error:', err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({
        error: err?.message || 'Internal server error',
      });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SyntaXViva] Server active at http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[SyntaXViva] HTTP server socket error:', err?.message || err);
  });

  // Graceful Shutdown Signal Handling (SIGTERM, SIGINT)
  let isShuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[SyntaXViva] Received ${signal}. Initiating graceful shutdown...`);

    const forceTimer = setTimeout(() => {
      console.warn('[SyntaXViva] Forcefully terminating active connections after timeout.');
      process.exit(1);
    }, 10000);
    forceTimer.unref();

    server.close((err) => {
      if (err) {
        console.error('[SyntaXViva] Error during HTTP server close:', err);
        process.exit(1);
      }
      console.log('[SyntaXViva] HTTP server closed gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Global Process Error Guards so the server never crashes unexpectedly
process.on('uncaughtException', (err) => {
  console.error('[SyntaXViva] Uncaught Exception (kept alive):', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SyntaXViva] Unhandled Promise Rejection (kept alive):', reason);
});

startServer().catch((err) => {
  console.error('[SyntaXViva] Fatal startup error:', err);
  process.exit(1);
});
