/**
 * Q&A Routes for InvestGhanaHub
 * Handles business questions, answers, and progress updates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { qaService } from '../services/qaService';
import { authMiddleware, businessOwnerMiddleware } from '../middleware/authMiddleware';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const createQuestionSchema = Joi.object({
  businessId: Joi.string().uuid().required().messages({
    'any.required': 'Business ID is required',
    'string.uuid': 'Invalid business ID format'
  }),
  question: Joi.string().min(1).max(1000).required().messages({
    'any.required': 'Question is required',
    'string.min': 'Question cannot be empty',
    'string.max': 'Question cannot exceed 1000 characters'
  }),
  isAnonymous: Joi.boolean().default(false).optional()
});

const createAnswerSchema = Joi.object({
  questionId: Joi.string().uuid().required().messages({
    'any.required': 'Question ID is required',
    'string.uuid': 'Invalid question ID format'
  }),
  answer: Joi.string().min(1).max(2000).required().messages({
    'any.required': 'Answer is required',
    'string.min': 'Answer cannot be empty',
    'string.max': 'Answer cannot exceed 2000 characters'
  }),
  attachments: Joi.array().items(Joi.string()).optional()
});

const createProgressUpdateSchema = Joi.object({
  businessId: Joi.string().uuid().required().messages({
    'any.required': 'Business ID is required',
    'string.uuid': 'Invalid business ID format'
  }),
  title: Joi.string().min(1).max(200).required().messages({
    'any.required': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title cannot exceed 200 characters'
  }),
  content: Joi.string().min(1).max(5000).required().messages({
    'any.required': 'Content is required',
    'string.min': 'Content cannot be empty',
    'string.max': 'Content cannot exceed 5000 characters'
  }),
  updateType: Joi.string().valid('MILESTONE', 'FINANCIAL', 'OPERATIONAL', 'GENERAL').required().messages({
    'any.required': 'Update type is required',
    'any.only': 'Invalid update type'
  }),
  attachments: Joi.array().items(Joi.string()).optional()
});

const getQuestionsSchema = Joi.object({
  businessId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
  isAnswered: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20).optional()
});

const getProgressUpdatesSchema = Joi.object({
  businessId: Joi.string().uuid().optional(),
  updateType: Joi.string().valid('MILESTONE', 'FINANCIAL', 'OPERATIONAL', 'GENERAL').optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20).optional()
});

// ===========================================
// Q&A ROUTES
// ===========================================

/**
 * POST /api/qa/questions
 * Create a question for a business
 */
router.post(
  '/questions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createQuestionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await qaService.createQuestion({
        ...value,
        userId
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Question posted successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/qa/answers
 * Answer a question
 */
router.post(
  '/answers',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createAnswerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await qaService.createAnswer({
        ...value,
        userId
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Answer posted successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/qa/questions
 * Get questions with filters
 */
router.get(
  '/questions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = getQuestionsSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const result = await qaService.getQuestions(value);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/qa/questions/:questionId
 * Get question by ID with answers
 */
router.get(
  '/questions/:questionId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { questionId } = req.params;
      const result = await qaService.getQuestionById(questionId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/qa/questions/:questionId
 * Delete question
 */
router.delete(
  '/questions/:questionId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { questionId } = req.params;
      const userId = (req as any).user.id;
      const result = await qaService.deleteQuestion(questionId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/qa/progress-updates
 * Create progress update for business
 */
router.post(
  '/progress-updates',
  authMiddleware,
  businessOwnerMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = createProgressUpdateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await qaService.createProgressUpdate(value, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Progress update created successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/qa/progress-updates
 * Get progress updates with filters
 */
router.get(
  '/progress-updates',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = getProgressUpdatesSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const result = await qaService.getProgressUpdates(value);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/qa/stats/:businessId
 * Get Q&A statistics for a business
 */
router.get(
  '/stats/:businessId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const result = await qaService.getQAStats(businessId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
