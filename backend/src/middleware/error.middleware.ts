/**
 * Error Middleware for InvestGhanaHub
 * Centralized error handling
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error.util';
import { env } from '../config/env';

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  console.error('Error:', err.message);
  if (env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }

  // Handle known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Handle Prisma errors
  if ((err as any).code === 'P2002') {
    res.status(400).json({
      success: false,
      message: 'A record with this value already exists',
    });
    return;
  }

  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Record not found',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

