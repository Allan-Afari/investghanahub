import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';

// Import security middleware
import { authLimiter, uploadLimiter, validateFileUpload, securityHeaders, blockSensitiveFiles } from './middleware/securityMiddleware';
import {
  accountLockoutMiddleware,
  suspiciousActivityMiddleware,
  sessionTimeoutMiddleware,
  passwordSprayProtection,
  sanitizeInput,
  concurrentSessionProtection,
} from './middleware/enhancedSecurityMiddleware';

// Import logging middleware
import { httpLogger } from './middleware/loggingMiddleware';

// Import error middleware
import { errorMiddleware } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/authRoutes';
import kycRoutes from './routes/kycRoutes';
import kycWebhookRoutes from './routes/kycWebhookRoutes';
import kycImageVerificationRoutes from './routes/kycImageVerificationRoutes';
import capitalRaisingRoutes from './routes/capitalRaisingRoutes';
import businessRoutes from './routes/businessRoutes';
import investmentRoutes from './routes/investmentRoutes';
import investmentTrackingRoutes from './routes/investmentTrackingRoutes';
import watchlistRoutes from './routes/watchlistRoutes';
import adminRoutes from './routes/adminRoutes';
import passwordRoutes from './routes/passwordRoutes';
import walletRoutes from './routes/walletRoutes';
import uploadRoutes from './routes/uploadRoutes';
import otpRoutes from './routes/otpRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import escrowRoutes from './routes/escrowRoutes';
import businessVerificationRoutes from './routes/businessVerificationRoutes';
import legalComplianceRoutes from './routes/legalComplianceRoutes';
import bankAccountRoutes from './routes/bankAccountRoutes';
import profitRoutes from './routes/profitRoutes';
import messagingRoutes from './routes/messagingRoutes';
import qaRoutes from './routes/qaRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import monetizationRoutes from './routes/monetizationRoutes';
import disputeRoutes from './routes/disputeRoutes';

// Initialize Express application
const app: Application = express();
app.disable('etag');

// ===========================================
// MONITORING INITIALIZATION
// ===========================================

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  import('./services/sentryService')
    .then(({ initializeSentry }) => initializeSentry())
    .catch((error: unknown) => {
      console.error('❌ Failed to initialize Sentry:', error);
    });
}

// Initialize metrics collection
if (process.env.ENABLE_METRICS === 'true') {
  import('./services/metricsService')
    .then((module) => module.default.initializeMetrics())
    .catch((error: unknown) => {
      console.error('❌ Failed to initialize metrics:', error);
    });
}

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet for security headers (with stricter CSP)
app.use(securityHeaders);

// Block access to sensitive files
app.use(blockSensitiveFiles);

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Mobile apps (Capacitor / WebView) often send no Origin header.
    if (!origin) return callback(null, true);

    const allowedOrigins = new Set<string>([env.FRONTEND_URL]);
    if (env.NODE_ENV !== 'production') {
      allowedOrigins.add('capacitor://localhost');
      allowedOrigins.add('ionic://localhost');
      allowedOrigins.add('http://localhost');
      allowedOrigins.add('https://localhost');
      // Allow all localhost ports in development
      allowedOrigins.add('http://localhost:5173');
      allowedOrigins.add('http://localhost:3000');
      allowedOrigins.add('http://127.0.0.1:5173');
      allowedOrigins.add('http://127.0.0.1:3000');
    }

    if (allowedOrigins.has(origin)) return callback(null, true);

    // Allow local network origins and localhost with any port only in non-production during development/testing.
    if (env.NODE_ENV !== 'production') {
      if (/^https?:\/\/192\.168\./.test(origin)) return callback(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Enhanced security middleware
app.use(suspiciousActivityMiddleware); // Detect suspicious IPs
app.use(sanitizeInput); // Prevent XSS attacks
app.use(accountLockoutMiddleware); // Prevent brute force
app.use(passwordSprayProtection); // Prevent password spraying
app.use(sessionTimeoutMiddleware); // Session management
app.use(concurrentSessionProtection); // Prevent session abuse

// ===========================================
// BODY PARSING MIDDLEWARE
// ===========================================

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===========================================
// LOGGING MIDDLEWARE
// ===========================================

// Request logging
app.use(httpLogger);

// ===========================================
// HEALTH CHECK ENDPOINT
// ===========================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'InvestGhanaHub API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// ===========================================
// API ROUTES
// ===========================================

// Mount all API routes under /api prefix with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/capital-raising', capitalRaisingRoutes); // Capital raising registration flow
app.use('/api/kyc', kycRoutes);
app.use('/api/kyc', kycImageVerificationRoutes);  // Image verification routes
app.use('/api', kycWebhookRoutes);  // Webhook routes (includes /api/webhooks/kyc/callback and /api/admin/kyc/*)
app.use('/api/businesses', businessRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/investments', investmentTrackingRoutes); // Investment tracking and analytics
app.use('/api/watchlist', watchlistRoutes); // Watchlist functionality
app.use('/api/admin', adminRoutes);
// Enhanced admin routes available at: /api/admin/enhanced/*
// See: backend/src/routes/enhancedAdminRoutes.ts
// Uncomment after testing: app.use('/api/admin/enhanced', enhancedAdminRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/upload', uploadLimiter, validateFileUpload, uploadRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/business-verification', businessVerificationRoutes);
app.use('/api/legal', legalComplianceRoutes);
app.use('/api/profits', profitRoutes);
app.use('/api/messages', messagingRoutes); // Secure messaging
app.use('/api/qa', qaRoutes); // Q&A and progress updates
app.use('/api/analytics', analyticsRoutes); // Analytics and dashboards
app.use('/api/monetization', monetizationRoutes); // Monetization and revenue
app.use('/api/disputes', disputeRoutes);

// ===========================================
// OPTIONAL FRONTEND SERVING (PRODUCTION)
// ===========================================

const shouldServeFrontend = env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND === 'true';
if (shouldServeFrontend) {
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));

  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ===========================================
// 404 HANDLER
// ===========================================

app.use((req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.status(404).send('Not found');
    return;
  }
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// ===========================================
// GLOBAL ERROR HANDLER
// ===========================================

app.use(errorMiddleware);

export default app;
