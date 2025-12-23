/**
 * Comprehensive Input Validation and Sanitization Module
 * Provides validation schemas, sanitization, and security checks
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// =============================================
// SANITIZATION
// =============================================

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove leading/trailing whitespace
  let sanitized = input.trim();
  
  // Remove common XSS patterns
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<embed/gi, '')
    .replace(/<object/gi, '');
  
  return sanitized;
}

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v) : v);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// =============================================
// VALIDATION SCHEMAS
// =============================================

// Common patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+233|0)[2-5][0-9]{8}$/,
  ghanaCard: /^[A-Z]{2}-\d{9}[A-Z]{1}$/i,
  url: /^https?:\/\/.+\..+/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/,
  businessName: /^[a-zA-Z0-9\s&'.-]{3,100}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

// User Registration Schema
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().lowercase().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string().pattern(new RegExp(patterns.strongPassword)).required()
    .messages({
      'string.pattern.base': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      'any.required': 'Password is required'
    }),
  firstName: Joi.string().trim().min(2).max(50).required()
    .messages({ 'any.required': 'First name is required' }),
  lastName: Joi.string().trim().min(2).max(50).required()
    .messages({ 'any.required': 'Last name is required' }),
  phone: Joi.string().pattern(new RegExp(patterns.phone)).optional()
    .messages({ 'string.pattern.base': 'Please provide a valid Ghana phone number (+233 or 0 format)' }),
}).required();

// User Login Schema
export const userLoginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
}).required();

// KYC Submission Schema
export const kycSubmissionSchema = Joi.object({
  ghanaCardNumber: Joi.string().pattern(new RegExp(patterns.ghanaCard)).required()
    .messages({ 'string.pattern.base': 'Ghana card number format: XX-123456789A' }),
  dateOfBirth: Joi.date().max('now').required()
    .messages({ 'date.max': 'Date of birth cannot be in the future' }),
  address: Joi.string().trim().min(5).max(255).required(),
  city: Joi.string().trim().min(2).max(50).required(),
  region: Joi.string().trim().min(2).max(50).required(),
  occupation: Joi.string().trim().max(100).optional(),
  sourceOfFunds: Joi.string().trim().max(255).optional(),
}).required();

// Business Registration Schema
export const businessRegistrationSchema = Joi.object({
  name: Joi.string().pattern(new RegExp(patterns.businessName)).required()
    .messages({ 'string.pattern.base': 'Business name must be 3-100 characters' }),
  description: Joi.string().trim().min(10).max(1000).required(),
  category: Joi.string().valid('startup', 'retail', 'services', 'manufacturing', 'agriculture', 'other').required(),
  location: Joi.string().trim().min(2).max(100).required(),
  region: Joi.string().trim().min(2).max(50).required(),
  targetCapital: Joi.number().min(1000).max(100000000).required()
    .messages({ 'number.base': 'Target capital must be a valid number' }),
  businessRegistration: Joi.string().trim().optional(),
  taxId: Joi.string().trim().optional(),
}).required();

// Investment Schema
export const investmentSchema = Joi.object({
  opportunityId: Joi.string().pattern(new RegExp(patterns.uuid)).required(),
  amount: Joi.number().min(100).required()
    .messages({ 'number.min': 'Minimum investment is 100' }),
  transactionReference: Joi.string().trim().max(100).optional(),
}).required();

// Withdrawal Schema
export const withdrawalSchema = Joi.object({
  amount: Joi.number().min(100).required(),
  bankAccount: Joi.string().trim().required(),
  bankCode: Joi.string().trim().required(),
}).required();

// Capital Raising Registration Schema
export const capitalRaisingSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().pattern(new RegExp(patterns.strongPassword)).required(),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  phone: Joi.string().pattern(new RegExp(patterns.phone)).optional(),
  businessName: Joi.string().pattern(new RegExp(patterns.businessName)).required(),
  businessDescription: Joi.string().trim().min(10).max(1000).required(),
  businessCategory: Joi.string().valid('startup', 'retail', 'services', 'manufacturing', 'agriculture', 'other').required(),
  businessLocation: Joi.string().trim().min(2).max(100).required(),
  businessRegion: Joi.string().trim().min(2).max(50).required(),
  targetCapital: Joi.number().min(1000).max(100000000).required(),
  ghanaCardNumber: Joi.string().pattern(new RegExp(patterns.ghanaCard)).optional(),
}).required();

// =============================================
// VALIDATION MIDDLEWARE
// =============================================

export interface ValidatedRequest extends Request {
  validatedData?: any;
}

export function validateRequest(schema: Joi.Schema) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    // Sanitize input
    const sanitized = sanitizeObject(req.body);

    // Validate
    const { error, value } = schema.validate(sanitized, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: details,
      });
    }

    req.validatedData = value;
    next();
  };
}

// =============================================
// BUSINESS LOGIC VALIDATORS
// =============================================

export class BusinessValidator {
  /**
   * Validate investment opportunity exists and is open
   */
  static async validateOpportunityActive(opportunityId: string): Promise<boolean> {
    // This would be implemented in actual service
    return true;
  }

  /**
   * Validate user has sufficient balance
   */
  static async validateSufficientBalance(userId: string, amount: number): Promise<boolean> {
    // This would check user wallet balance
    return true;
  }

  /**
   * Validate KYC is approved
   */
  static async validateKycApproved(userId: string): Promise<boolean> {
    // This would check KYC status
    return true;
  }

  /**
   * Validate business ownership
   */
  static async validateBusinessOwner(userId: string, businessId: string): Promise<boolean> {
    // This would verify ownership
    return true;
  }
}

export default {
  sanitizeInput,
  sanitizeObject,
  validateRequest,
  BusinessValidator,
};
