/**
 * Validation Middleware for InvestGhanaHub
 * Request validation using Joi
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../utils/error.util';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors: Record<string, string[]> = {};
      error.details.forEach((detail) => {
        const key = detail.path.join('.');
        if (!errors[key]) {
          errors[key] = [];
        }
        errors[key].push(detail.message);
      });
      next(AppError.badRequest('Validation failed', errors));
      return;
    }

    req.body = value;
    next();
  };
};

