/**
 * Logging Middleware for InvestGhanaHub
 * Provides structured logging using Winston
 */

import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for HTTP requests
const httpFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info: any) => {
    const { timestamp, level, message, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    });
  })
);

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: httpFormat,
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production then log to the `console` with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf((info: any) => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
      })
    )
  }));
}

// HTTP request logging middleware
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip, headers } = req;

  // Log request
  logger.http('Request received', {
    method,
    url,
    ip,
    userAgent: headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    const logData = {
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    if (statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

// Security event logging
export const securityLogger = {
  suspiciousActivity: (data: any) => {
    logger.warn('Suspicious activity detected', {
      type: 'SECURITY_EVENT',
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  authenticationFailure: (data: any) => {
    logger.warn('Authentication failure', {
      type: 'AUTH_FAILURE',
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  rateLimitExceeded: (data: any) => {
    logger.warn('Rate limit exceeded', {
      type: 'RATE_LIMIT',
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  fraudAlert: (data: any) => {
    logger.error('Fraud alert triggered', {
      type: 'FRAUD_ALERT',
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

// Business logic logging
export const businessLogger = {
  investment: (data: any) => {
    logger.info('Investment processed', {
      type: 'INVESTMENT',
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  kycSubmission: (data: any) => {
    logger.info('KYC submission received', {
      type: 'KYC_SUBMISSION',
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  payment: (data: any) => {
    logger.info('Payment processed', {
      type: 'PAYMENT',
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  error: (error: Error, context?: any) => {
    logger.error('Business logic error', {
      type: 'BUSINESS_ERROR',
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString()
    });
  }
};

// Database operation logging
export const dbLogger = {
  query: (query: string, duration: number, params?: any) => {
    logger.debug('Database query executed', {
      type: 'DB_QUERY',
      query,
      duration,
      params,
      timestamp: new Date().toISOString()
    });
  },

  error: (error: Error, query?: string) => {
    logger.error('Database error', {
      type: 'DB_ERROR',
      error: error.message,
      stack: error.stack,
      query,
      timestamp: new Date().toISOString()
    });
  },

  connection: (status: 'connected' | 'disconnected' | 'error', details?: any) => {
    logger.info('Database connection status', {
      type: 'DB_CONNECTION',
      status,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance monitoring
export const performanceLogger = {
  slowQuery: (query: string, duration: number) => {
    logger.warn('Slow database query detected', {
      type: 'PERFORMANCE',
      query,
      duration,
      threshold: 1000, // 1 second
      timestamp: new Date().toISOString()
    });
  },

  highMemoryUsage: (usage: number) => {
    logger.warn('High memory usage detected', {
      type: 'PERFORMANCE',
      memoryUsage: usage,
      threshold: 512 * 1024 * 1024, // 512MB
      timestamp: new Date().toISOString()
    });
  }
};

// Export logger instance for direct use
export default logger;
