import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Security headers middleware using helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Compression middleware (placeholder - would need compression package)
export const compressionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Compression would be implemented here if needed
  next();
};

// API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request size limit middleware
export const requestSizeLimit = express.json({ limit: '10mb' });

// Input sanitization middleware
export const sanitizeInput = [
  body('*').trim().escape(),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array(),
      });
    }
    next();
  },
];

// API security headers
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

// Security logger middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Security: ${req.method} ${req.path} from ${req.ip}`);
  next();
};

// File upload validation middleware
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  // Add more validation logic here as needed
  // e.g., file type, size checks

  next();
};
