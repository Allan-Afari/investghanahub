import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { body, validationResult } from 'express-validator';

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

export const registerValidationSchema = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('phone')
    .optional()
    .matches(/^(\+233|0)[2-5][0-9]{8}$/)
    .withMessage('Please provide a valid Ghanaian phone number'),
  body('role')
    .optional()
    .isIn(['INVESTOR', 'BUSINESS_OWNER'])
    .withMessage('Role must be either INVESTOR or BUSINESS_OWNER')
];

export const loginValidationSchema = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const kycValidationSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim().required(),
  lastName: Joi.string().min(2).max(50).trim().required(),
  dateOfBirth: Joi.date().max('now').required(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
  nationality: Joi.string().min(2).max(50).trim().required(),
  address: Joi.string().min(10).max(200).trim().required(),
  city: Joi.string().min(2).max(50).trim().required(),
  region: Joi.string().min(2).max(50).trim().required(),
  postalCode: Joi.string().min(3).max(10).trim().optional(),
  phone: Joi.string().pattern(/^(\+233|0)[2-5][0-9]{8}$/).required(),
  idType: Joi.string().valid('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID').required(),
  idNumber: Joi.string().min(5).max(20).trim().required(),
  occupation: Joi.string().min(2).max(50).trim().required(),
  sourceOfFunds: Joi.string().min(10).max(200).trim().required(),
  annualIncome: Joi.number().min(0).required(),
  taxId: Joi.string().min(5).max(20).trim().optional(),
  politicallyExposed: Joi.boolean().required(),
  termsAccepted: Joi.boolean().valid(true).required(),
  privacyAccepted: Joi.boolean().valid(true).required()
});

// ===========================================
// VALIDATION MIDDLEWARE
// ===========================================

export const validate = (validations: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if it's a Joi schema
    if (validations.isJoi && validations.isJoi === true) {
      // Handle Joi validation
      const { error } = validations.validate(req.body, { abortEarly: false });
      if (error) {
        const extractedErrors: any[] = [];
        error.details.forEach((detail: any) => {
          extractedErrors.push({ [detail.path.join('.')]: detail.message });
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: extractedErrors
        });
      }
      return next();
    }

    // Handle express-validator
    if (Array.isArray(validations)) {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      const extractedErrors: any[] = [];
      errors.array().forEach((err: any) => {
        extractedErrors.push({ [err.param]: err.msg });
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: extractedErrors
      });
    }

    // If neither, pass through
    next();
  };
};

// ===========================================
// PASSWORD STRENGTH VALIDATION
// ===========================================

export const validatePasswordStrength = (req: Request, res: Response, next: NextFunction) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  const isLongEnough = password.length >= 8;

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar || !isLongEnough) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet strength requirements',
      requirements: {
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar,
        isLongEnough
      }
    });
  }

  next();
};

// ===========================================
// INPUT SANITIZATION
// ===========================================

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string fields
  const sanitizeString = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

// ===========================================
// RATE LIMITING
// ===========================================

import rateLimit from 'express-rate-limit';

export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// ===========================================
// CSRF PROTECTION PLACEHOLDER
// ===========================================

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // CSRF protection would be implemented here
  // For now, just pass through
  next();
};

// ===========================================
// SQL INJECTION PROTECTION
// ===========================================

export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  // Basic SQL injection protection
  const dangerousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\\x23)|(\%27)|(\%23)|(\%2D\%2D))/i
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};

// ===========================================
// XSS PROTECTION
// ===========================================

export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Basic XSS protection
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query)) {
    return res.status(400).json({
      success: false,
      message: 'Potentially dangerous input detected'
    });
  }

  next();
};
