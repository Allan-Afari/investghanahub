/**
 * Comprehensive Error Handling Utility
 * Standardizes error responses and categorization
 */

import { Response } from 'express';

// Error Categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
}

// Error Status Mapping
const statusMap: Record<ErrorCategory, number> = {
  [ErrorCategory.VALIDATION]: 400,
  [ErrorCategory.AUTHENTICATION]: 401,
  [ErrorCategory.AUTHORIZATION]: 403,
  [ErrorCategory.NOT_FOUND]: 404,
  [ErrorCategory.CONFLICT]: 409,
  [ErrorCategory.RATE_LIMIT]: 429,
  [ErrorCategory.SERVER_ERROR]: 500,
  [ErrorCategory.EXTERNAL_SERVICE]: 502,
  [ErrorCategory.DATABASE]: 500,
};

export class AppError extends Error {
  constructor(
    public message: string,
    public category: ErrorCategory = ErrorCategory.SERVER_ERROR,
    public statusCode: number = statusMap[ErrorCategory.SERVER_ERROR],
    public details?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific Error Classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCategory.VALIDATION, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorCategory.AUTHENTICATION, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ErrorCategory.AUTHORIZATION, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, ErrorCategory.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, ErrorCategory.CONFLICT, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, ErrorCategory.RATE_LIMIT, 429);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, ErrorCategory.DATABASE, 500, details);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error', code?: string) {
    super(message, ErrorCategory.EXTERNAL_SERVICE, 502, undefined, code);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Error Response Handler
 */
export class ErrorHandler {
  /**
   * Format error response
   */
  static formatResponse(error: any, isDev: boolean = false): Record<string, any> {
    const isAppError = error instanceof AppError;

    const response: Record<string, any> = {
      success: false,
      message: error.message || 'An error occurred',
      timestamp: new Date().toISOString(),
    };

    if (isAppError) {
      response.category = error.category;
      response.code = error.code;
      if (error.details && isDev) {
        response.details = error.details;
      }
    }

    if (isDev && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  /**
   * Send error response
   */
  static send(res: Response, error: any, isDev: boolean = false): Response {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const formattedError = this.formatResponse(error, isDev);
    return res.status(statusCode).json(formattedError);
  }

  /**
   * Handle Prisma errors
   */
  static handlePrismaError(error: any): AppError {
    const isDev = process.env.NODE_ENV === 'development';

    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        return new ConflictError(`A record with this ${field} already exists`);

      case 'P2025':
        // Record not found
        return new NotFoundError('Record not found');

      case 'P2003':
        // Foreign key constraint failed
        return new ValidationError('Invalid reference: related record not found');

      case 'P2014':
        // Required relation violation
        return new ValidationError('Cannot delete: required related records exist');

      case 'P2016':
        // Query interpretation error
        return new ValidationError('Invalid query parameters');

      default:
        const message = isDev ? error.message : 'Database operation failed';
        return new DatabaseError(message, error);
    }
  }

  /**
   * Handle JWT errors
   */
  static handleJWTError(error: any): AppError {
    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('Invalid token');
    }
    if (error.name === 'NotBeforeError') {
      return new AuthenticationError('Token not yet valid');
    }
    return new AuthenticationError('Authentication error');
  }

  /**
   * Create validation error from Joi
   */
  static handleJoiError(error: any): ValidationError {
    const details = error.details?.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
    })) || [];

    return new ValidationError('Validation failed', details);
  }

  /**
   * Log error for monitoring
   */
  static log(error: any, context?: string): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context: context || 'Unknown',
      message: error.message,
      category: error instanceof AppError ? error.category : 'UNKNOWN',
      stack: error.stack,
    };

    // Log based on severity
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        console.error('🔴 CRITICAL:', errorInfo);
      } else {
        console.warn('🟡 WARNING:', errorInfo);
      }
    } else {
      console.error('🔴 UNEXPECTED:', errorInfo);
    }
  }
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ErrorHandler,
  ErrorCategory,
};
