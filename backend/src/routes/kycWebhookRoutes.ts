/**
 * KYC Webhook Routes
 * Handles callbacks from KYC providers and admin KYC operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { kycProviderService } from '../services/kycProviderService';
import { authMiddleware } from '../middleware/authMiddleware';
import { prisma } from '../config/database';

const router = Router();

// ===========================================
// WEBHOOK ENDPOINTS (Unauthenticated)
// ===========================================

/**
 * POST /api/webhooks/kyc/callback
 * Webhook endpoint for KYC provider to send verification results
 * Signature-verified callback from external KYC service
 */
router.post('/webhooks/kyc/callback', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { payload, signature } = req.body;

    if (!payload || !signature) {
      res.status(400).json({
        success: false,
        message: 'Missing payload or signature in webhook request',
      });
      return;
    }

    // Verify webhook signature
    const isValid = kycProviderService.verifyWebhookSignature(
      JSON.stringify(payload),
      signature
    );

    if (!isValid) {
      console.warn('⚠️ Invalid KYC webhook signature');
      res.status(401).json({
        success: false,
        message: 'Webhook signature verification failed',
      });
      return;
    }

    // Process webhook callback
    await kycProviderService.handleWebhookCallback(payload);

    res.status(200).json({
      success: true,
      message: 'KYC webhook processed successfully',
      verificationId: payload.verificationId,
    });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process KYC webhook',
      error: error.message,
    });
  }
});

// ===========================================
// AUTHENTICATED KYC ENDPOINTS
// ===========================================

/**
 * POST /api/kyc/initiate
 * User initiates KYC verification
 */
router.post(
  '/kyc/initiate',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { ghanaCardNumber, firstName, lastName, dateOfBirth, phoneNumber } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!ghanaCardNumber || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Ghana card number, first name, and last name are required',
        });
        return;
      }

      // Check if user already has pending/approved KYC
      const existingKYC = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (existingKYC?.status === 'APPROVED') {
        res.status(400).json({
          success: false,
          message: 'User already has approved KYC verification',
        });
        return;
      }

      if (existingKYC?.status === 'PENDING') {
        res.status(400).json({
          success: false,
          message: 'KYC verification already in progress',
        });
        return;
      }

      // Initiate verification
      const result = await kycProviderService.initiateVerification({
        userId,
        ghanaCardNumber,
        firstName,
        lastName,
        dateOfBirth,
        phoneNumber,
      });

      // Update user KYC status to PENDING or create new KYC record
      if (existingKYC) {
        await prisma.kYC.update({
          where: { userId },
          data: {
            status: 'PENDING',
          },
        });
      } else {
        await prisma.kYC.create({
          data: {
            userId,
            ghanaCardNumber,
            status: 'PENDING',
            dateOfBirth: new Date(dateOfBirth || Date.now()),
            address: 'To be verified',
            city: 'To be verified',
            region: 'To be verified',
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'KYC verification initiated',
        data: result,
      });
    } catch (error: any) {
      console.error('❌ KYC initiation error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate KYC verification',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/kyc/status
 * Check user's KYC verification status
 */
router.get(
  '/kyc/status',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
        },
      });

      const kyc = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          kycStatus: kyc?.status || 'NOT_STARTED',
          verifiedAt: kyc?.reviewedAt,
        },
      });
    } catch (error: any) {
      console.error('❌ KYC status fetch error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch KYC status',
        error: error.message,
      });
    }
  }
);

// ===========================================
// ADMIN ENDPOINTS
// ===========================================

/**
 * GET /api/admin/kyc/stats
 * Admin: Get KYC verification statistics
 */
router.get(
  '/admin/kyc/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      // Verify admin role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      // Get KYC statistics
      const stats = await kycProviderService.getKYCStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ KYC stats fetch error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch KYC statistics',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/admin/kyc/approve
 * Admin: Manually approve KYC verification
 */
router.post(
  '/admin/kyc/approve',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { userId, riskScore } = req.body;

      // Verify admin role
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });

      if (admin?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      // Update user KYC status to APPROVED
      const kyc = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'KYC record not found for user',
        });
        return;
      }

      await prisma.kYC.update({
        where: { userId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });

      console.log(`✅ Admin ${adminId} approved KYC for user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'KYC verification approved',
      });
    } catch (error: any) {
      console.error('❌ KYC approval error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to approve KYC verification',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/admin/kyc/reject
 * Admin: Manually reject KYC verification
 */
router.post(
  '/admin/kyc/reject',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { userId, reason } = req.body;

      // Verify admin role
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });

      if (admin?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      // Update user KYC status to REJECTED
      const kyc = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'KYC record not found for user',
        });
        return;
      }

      await prisma.kYC.update({
        where: { userId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Rejected by admin',
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });

      console.log(`❌ Admin ${adminId} rejected KYC for user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'KYC verification rejected',
      });
    } catch (error: any) {
      console.error('❌ KYC rejection error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to reject KYC verification',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/kyc/users
 * Admin: List all users with their KYC status
 */
router.get(
  '/admin/kyc/users',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { status, page = 1, limit = 20 } = req.query;

      // Verify admin role
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });

      if (admin?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }

      // Build where clause based on status filter
      const kycWhere: any = {};
      if (status) {
        kycWhere.status = status;
      }

      // Fetch users with pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const kycs = await prisma.kYC.findMany({
        where: kycWhere,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });

      const users = kycs.map((kyc: (typeof kycs)[number]) => ({
        id: kyc.user.id,
        email: kyc.user.email,
        firstName: kyc.user.firstName,
        lastName: kyc.user.lastName,
        kycStatus: kyc.status,
        verifiedAt: kyc.reviewedAt,
        createdAt: kyc.user.createdAt,
      }));

      const total = await prisma.kYC.count({ where: kycWhere });

      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('❌ KYC users fetch error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch KYC users',
        error: error.message,
      });
    }
  }
);

export default router;
