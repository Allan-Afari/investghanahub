import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { legalComplianceService } from '../services/legalComplianceService';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all legal compliance routes
router.use(authMiddleware);

/**
 * POST /api/legal/terms
 * Create terms and conditions (Admin only)
 */
router.post(
  '/terms',
  [
    body('type').isIn(['INVESTOR', 'BUSINESS_OWNER', 'PLATFORM']).withMessage('Invalid terms type'),
    body('version').notEmpty().withMessage('Version is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('effectiveDate').isISO8601().toDate().withMessage('Valid effective date is required'),
    body('isCurrent').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: errors.array(),
        });
      }

      const { type, version, content, effectiveDate, isCurrent } = req.body;
      const userId = (req as any).user.id;

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const result = await legalComplianceService.createTerms({
        type,
        version,
        content,
        effectiveDate: new Date(effectiveDate),
        isCurrent: isCurrent || false,
      }, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Terms created successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to create terms',
        });
      }
    } catch (error: any) {
      console.error('Create terms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create terms',
      });
    }
  }
);

/**
 * POST /api/legal/disclaimer
 * Create disclaimer (Admin only)
 */
router.post(
  '/disclaimer',
  [
    body('type').isIn(['INVESTMENT_RISK', 'TAX_IMPLICATIONS', 'REGULATORY', 'PLATFORM_LIMITATIONS']).withMessage('Invalid disclaimer type'),
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('requiredAcceptance').optional().isBoolean(),
    body('applicableRoles').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: errors.array(),
        });
      }

      const { type, title, content, requiredAcceptance, applicableRoles } = req.body;
      const userId = (req as any).user.id;

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const result = await legalComplianceService.createDisclaimer({
        type,
        title,
        content,
        requiredAcceptance,
        applicableRoles,
      }, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Disclaimer created successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to create disclaimer',
        });
      }
    } catch (error: any) {
      console.error('Create disclaimer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create disclaimer',
      });
    }
  }
);

/**
 * GET /api/legal/current
 * Get current terms and disclaimers
 */
router.get(
  '/current',
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const result = await legalComplianceService.getCurrentTermsAndDisclaimers(user?.role);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Terms and disclaimers retrieved successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to get terms and disclaimers',
        });
      }
    } catch (error: any) {
      console.error('Get current terms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get terms and disclaimers',
      });
    }
  }
);

/**
 * POST /api/legal/accept
 * Record user agreement acceptance
 */
router.post(
  '/accept',
  [
    body('termsId').notEmpty().withMessage('Terms ID is required'),
    body('disclaimerIds').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: errors.array(),
        });
      }

      const { termsId, disclaimerIds } = req.body;
      const userId = (req as any).user.id;
      const ipAddress = req.ip || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await legalComplianceService.recordUserAgreement({
        userId,
        termsId,
        disclaimerIds: disclaimerIds || [],
        ipAddress: ipAddress || '0.0.0.0',
        userAgent: userAgent || 'Unknown',
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Agreement accepted successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to accept agreement',
        });
      }
    } catch (error: any) {
      console.error('Accept agreement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept agreement',
      });
    }
  }
);

/**
 * GET /api/legal/check/:userId
 * Check if user has accepted current terms
 */
router.get(
  '/check/:userId?',
  async (req: Request, res: Response) => {
    try {
      const targetUserId = req.params.userId || (req as any).user.id;
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const result = await legalComplianceService.checkUserAgreement(
        targetUserId,
        user.role
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Agreement status retrieved successfully',
          data: {
            hasAccepted: result.hasAccepted,
            agreement: result.data,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to check agreement',
        });
      }
    } catch (error: any) {
      console.error('Check agreement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check agreement',
      });
    }
  }
);

/**
 * GET /api/legal/compliance/ghana
 * Get Ghana-specific compliance requirements
 */
router.get(
  '/compliance/ghana',
  async (req: Request, res: Response) => {
    try {
      const result = await legalComplianceService.getGhanaComplianceRequirements();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Compliance requirements retrieved successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to get compliance requirements',
        });
      }
    } catch (error: any) {
      console.error('Get compliance requirements error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance requirements',
      });
    }
  }
);

/**
 * GET /api/legal/risk-disclosure/:businessId
 * Generate investment risk disclosure
 */
router.get(
  '/risk-disclosure/:businessId',
  async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const { amount } = req.query;

      if (!amount) {
        return res.status(400).json({
          success: false,
          message: 'Investment amount is required',
        });
      }

      const result = await legalComplianceService.generateRiskDisclosure(
        businessId,
        Number(amount)
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Risk disclosure generated successfully',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to generate risk disclosure',
        });
      }
    } catch (error: any) {
      console.error('Generate risk disclosure error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate risk disclosure',
      });
    }
  }
);

export default router;
