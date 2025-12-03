/**
 * Upload Routes for InvestGhanaHub
 * Handles file uploads for KYC documents, profile pictures, etc.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { uploadService, uploadImage, uploadDocument } from '../services/uploadService';
import { authMiddleware } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// All upload routes require authentication
router.use(authMiddleware);

/**
 * POST /api/upload/profile-picture
 * Upload user profile picture
 */
router.post(
  '/profile-picture',
  uploadImage.single('image'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
        return;
      }

      const userId = (req as any).user.id;

      // Upload to Cloudinary
      const result = await uploadService.uploadProfilePicture(req.file, userId);

      // Update user profile
      await prisma.user.update({
        where: { id: userId },
        data: { profileImage: result.url },
      });

      res.status(200).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: { url: result.url },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload/kyc-document
 * Upload KYC document (Ghana Card photo)
 */
router.post(
  '/kyc-document',
  uploadDocument.single('document'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No document file provided',
        });
        return;
      }

      const userId = (req as any).user.id;
      const documentType = req.body.documentType || 'ghana_card';

      // Upload to Cloudinary
      const result = await uploadService.uploadKYCDocument(req.file, userId, documentType);

      // Update KYC record if exists
      const existingKYC = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (existingKYC) {
        await prisma.kYC.update({
          where: { userId },
          data: { documentUrl: result.url },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { url: result.url },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload/kyc-selfie
 * Upload KYC selfie for verification
 */
router.post(
  '/kyc-selfie',
  uploadImage.single('selfie'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No selfie image provided',
        });
        return;
      }

      const userId = (req as any).user.id;

      // Upload to Cloudinary
      const result = await uploadService.uploadKYCDocument(req.file, userId, 'selfie');

      // Update KYC record if exists
      const existingKYC = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (existingKYC) {
        await prisma.kYC.update({
          where: { userId },
          data: { selfieUrl: result.url },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Selfie uploaded successfully',
        data: { url: result.url },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload/business-document
 * Upload business document
 */
router.post(
  '/business-document',
  uploadDocument.single('document'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No document file provided',
        });
        return;
      }

      const userId = (req as any).user.id;
      const { businessId, documentType = 'registration' } = req.body;

      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      // Verify business ownership
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || business.ownerId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to upload documents for this business',
        });
        return;
      }

      // Upload to Cloudinary
      const result = await uploadService.uploadBusinessDocument(req.file, businessId, documentType);

      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { url: result.url },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

