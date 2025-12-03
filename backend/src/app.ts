/**
 * InvestGhanaHub Express Application Configuration
 * Sets up middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/authRoutes';
import kycRoutes from './routes/kycRoutes';
import businessRoutes from './routes/businessRoutes';
import investmentRoutes from './routes/investmentRoutes';
import adminRoutes from './routes/adminRoutes';
import passwordRoutes from './routes/passwordRoutes';
import walletRoutes from './routes/walletRoutes';
import uploadRoutes from './routes/uploadRoutes';
import otpRoutes from './routes/otpRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Initialize Express application
const app: Application = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet for security headers
app.use(helmet());

// CORS configuration - Allow all origins in development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// ===========================================
// BODY PARSING MIDDLEWARE
// ===========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// REQUEST LOGGING (Development)
// ===========================================

if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// ===========================================
// HEALTH CHECK ENDPOINT
// ===========================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'InvestGhanaHub API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===========================================
// API ROUTES
// ===========================================

// Mount all API routes under /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/notifications', notificationRoutes);

// ===========================================
// 404 HANDLER
// ===========================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// ===========================================
// GLOBAL ERROR HANDLER
// ===========================================

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

app.use((err: CustomError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: 'A record with this value already exists'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;

