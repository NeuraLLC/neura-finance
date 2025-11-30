import 'dotenv/config';
import express, { Request, Response, Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './src/middleware/errorHandler';
import { requestLogger } from './src/middleware/logger';

import { ddosMiddleware, ddosProtection } from './src/middleware/ddosProtection';
import { burstMiddleware, burstDetection } from './src/middleware/burstDetection';
import { advancedRateLimiting } from './src/middleware/advancedRateLimiting';

const authRoutes = require('./src/routes/auth.routes');
const merchantRoutes = require('./src/routes/merchants.routes');
const paymentRoutes = require('./src/routes/payments.routes');
const stripeConnectRoutes = require('./src/routes/stripeConnect.routes');
const webhookRoutes = require('./src/routes/webhooks.routes');
const disputeRoutes = require('./src/routes/disputes.routes');

const app: Application = express();
const PORT = process.env.PORT || 3000;

// 1. Security headers first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// 2. CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key'],
}));

// 3. DDoS Protection (First line of defense)
app.use(ddosMiddleware);

// 4. Burst Detection (Second line of defense)
app.use(burstMiddleware);

// 5. Global Rate Limiting (Third line of defense)
app.use('/api/', advancedRateLimiting.globalLimiter);

// ==============================================
// BODY PARSING MIDDLEWARE
// ==============================================

// Special handling for Stripe webhooks (needs raw body)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON body parser for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(requestLogger);


// Serve static files from public directory
app.use(express.static('public'));

// ==============================================
// ROOT & HEALTH ENDPOINTS
// ==============================================

// Root endpoint - redirect to health dashboard
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/health-dashboard.html');
});

// Health check endpoint - HTML for browsers, JSON for APIs
app.get('/health', (req: Request, res: Response) => {
  const acceptsHtml = req.headers.accept?.includes('text/html');

  if (acceptsHtml) {
    // Serve HTML dashboard for browser requests
    return res.sendFile('health-dashboard.html', { root: './public' });
  }

  // Return JSON for API requests
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    security: {
      ddos: ddosProtection.getStats(),
      burst: burstDetection.getStats(),
      rateLimits: advancedRateLimiting.getStats(),
    },
  });
});

// Security stats endpoint (for monitoring) - HTML for browsers, JSON for APIs
app.get('/security/stats', (req: Request, res: Response) => {
  // In production, this should be authenticated
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-admin-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin API key required',
        },
      });
    }
  }

  const acceptsHtml = req.headers.accept?.includes('text/html');

  if (acceptsHtml) {
    // Serve HTML dashboard for browser requests
    return res.sendFile('security-dashboard.html', { root: './public' });
  }

  // Return JSON for API requests
  res.json({
    success: true,
    data: {
      ddos: ddosProtection.getStats(),
      burst: burstDetection.getStats(),
      rateLimits: advancedRateLimiting.getStats(),
      timestamp: new Date().toISOString(),
    },
  });
});

// ==============================================
// API ROUTES WITH SPECIFIC RATE LIMITING
// ==============================================

// Authentication routes (strict rate limiting)
app.use('/auth', advancedRateLimiting.authLimiter, authRoutes);

// Merchant routes (standard rate limiting)
app.use('/merchants', merchantRoutes);

// Payment routes (payment-specific rate limiting)
app.use('/payments', advancedRateLimiting.paymentLimiter, paymentRoutes);

// Dispute routes (standard rate limiting)
app.use('/disputes', disputeRoutes);
app.use('/merchants', disputeRoutes);

// Stripe Connect routes (standard rate limiting)
app.use('/stripe-connect', stripeConnectRoutes);

// Webhook routes (permissive rate limiting for external services)
app.use('/webhooks', advancedRateLimiting.webhookLimiter, webhookRoutes);

// ==============================================
// ERROR HANDLING
// ==============================================

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handling middleware (must be last)
app.use(errorHandler);

// ==============================================
// SERVER STARTUP
// ==============================================

const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`= NeuraPay API Server v2.0`);
  console.log(`${'='.repeat(60)}`);
  console.log(`= Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`= Server running on port ${PORT}`);
  console.log(`= Health check: http://localhost:${PORT}/health`);
  console.log(`= Security stats: http://localhost:${PORT}/security/stats`);
  console.log(`\n=  Security Features Enabled:`);
  console.log(`    DDoS Protection`);
  console.log(`    Burst Detection`);
  console.log(`    Advanced Rate Limiting`);
  console.log(`    Helmet Security Headers`);
  console.log(`    CORS Protection`);
  console.log(`${'='.repeat(60)}\n`);
});

// ==============================================
// GRACEFUL SHUTDOWN
// ==============================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  server.close(() => {
    console.log(' HTTP server closed');
    console.log('=K NeuraPay API Server stopped');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('L Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==============================================
// UNHANDLED ERRORS
// ==============================================

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('L Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to log to Sentry here
});

process.on('uncaughtException', (error: Error) => {
  console.error('L Uncaught Exception:', error);
  // In production, you might want to log to Sentry here
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;
