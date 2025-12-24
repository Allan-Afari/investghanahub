/**
 * Messaging Routes for InvestGhanaHub
 * Handles secure messaging between users
 */

import { Router, Request, Response, NextFunction } from 'express';
import { messagingService } from '../services/messagingService';
import { authMiddleware } from '../middleware/authMiddleware';
import Joi from 'joi';

const router = Router();

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

const sendMessageSchema = Joi.object({
  receiverId: Joi.string().uuid().required().messages({
    'any.required': 'Receiver ID is required',
    'string.uuid': 'Invalid receiver ID format'
  }),
  businessId: Joi.string().uuid().optional(),
  subject: Joi.string().max(200).optional(),
  content: Joi.string().min(1).max(2000).required().messages({
    'any.required': 'Message content is required',
    'string.min': 'Message content cannot be empty',
    'string.max': 'Message content cannot exceed 2000 characters'
  }),
  messageType: Joi.string().valid('TEXT', 'DOCUMENT', 'IMAGE').default('TEXT').optional(),
  attachments: Joi.array().items(Joi.string()).optional()
});

const getMessagesSchema = Joi.object({
  messageType: Joi.string().valid('SENT', 'RECEIVED').optional(),
  businessId: Joi.string().uuid().optional(),
  isRead: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20).optional()
});

const markAsReadSchema = Joi.object({
  messageIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'any.required': 'Message IDs array is required',
    'array.min': 'At least one message ID is required'
  })
});

const conversationSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    'any.required': 'User ID is required',
    'string.uuid': 'Invalid user ID format'
  }),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(50).optional()
});

// ===========================================
// MESSAGING ROUTES
// ===========================================

/**
 * POST /api/messages/send
 * Send a message
 */
router.post(
  '/send',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = sendMessageSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const senderId = (req as any).user.id;
      const result = await messagingService.sendMessage({
        ...value,
        senderId
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Message sent successfully',
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
 * GET /api/messages
 * Get user's messages with filters
 */
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = getMessagesSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await messagingService.getMessages({
        userId,
        ...value
      });

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
 * GET /api/messages/:messageId
 * Get message by ID
 */
router.get(
  '/:messageId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { messageId } = req.params;
      const userId = (req as any).user.id;

      const result = await messagingService.getMessageById(messageId, userId);

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
 * PUT /api/messages/mark-read
 * Mark messages as read
 */
router.put(
  '/mark-read',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = markAsReadSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const userId = (req as any).user.id;
      const result = await messagingService.markMessagesAsRead(value.messageIds, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
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
 * DELETE /api/messages/:messageId
 * Delete message
 */
router.delete(
  '/:messageId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { messageId } = req.params;
      const userId = (req as any).user.id;

      const result = await messagingService.deleteMessage(messageId, userId);

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
 * GET /api/messages/conversation/:userId
 * Get conversation between two users
 */
router.get(
  '/conversation/:userId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = conversationSchema.validate({
        userId: req.params.userId,
        page: req.query.page,
        limit: req.query.limit
      });

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const currentUserId = (req as any).user.id;
      const result = await messagingService.getConversation(
        currentUserId,
        value.userId,
        value.page,
        value.limit
      );

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
 * GET /api/messages/stats
 * Get user's message statistics
 */
router.get(
  '/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await messagingService.getMessageStats(userId);

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
