/**
 * Error Utility for InvestGhanaHub
 * Custom error class with status codes and error details
 */

export class AppError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number = 500, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message: string = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static internal(message: string = 'Internal server error') {
    return new AppError(message, 500);
  }
}

