/**
 * KYC Image Verification Routes
 * Handles Ghana card and selfie uploads with automatic age verification
 */

import { Router, Request, Response, NextFunction } from 'express';
import { KYCStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { prisma } from '../config/database';
import { ghanaCardVerificationService } from '../services/ghanaCardVerificationService';
import { fileUploadHelper } from '../services/fileUploadHelper';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (validMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ===========================================
// KYC IMAGE UPLOAD & VERIFICATION ENDPOINTS
// ===========================================

/**
 * POST /api/kyc/verify-with-images
 * Complete KYC verification with Ghana card and selfie photos
 * Automatically verifies age from Ghana card
 * Performs facial matching between card photo and selfie
 *
 * Request: multipart/form-data
 * - ghanaCardPhoto: File (Ghana card front photo)
 * - selfiePhoto: File (User selfie photo)
 * - ghanaCardNumber: String (Ghana card number)
 * - firstName: String
 * - lastName: String
 */
router.post(
  '/kyc/verify-with-images',
  authMiddleware,
  upload.fields([
    { name: 'ghanaCardPhoto', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
  ]),
  async (req: Request & { files?: any }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { ghanaCardNumber, firstName, lastName } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Validate required fields
      if (!ghanaCardNumber || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Ghana card number, first name, and last name are required',
        });
        return;
      }

      // Validate file uploads
      if (!req.files?.ghanaCardPhoto || !req.files?.selfiePhoto) {
        res.status(400).json({
          success: false,
          message: 'Both Ghana card photo and selfie photo are required',
        });
        return;
      }

      // Check if user already has approved KYC
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

      // Save uploaded files locally
      console.log('📤 Saving uploaded files...');
      const cardFile = await fileUploadHelper.saveFileLocally(
        userId,
        req.files.ghanaCardPhoto[0].buffer,
        'card'
      );
      const selfieFile = await fileUploadHelper.saveFileLocally(
        userId,
        req.files.selfiePhoto[0].buffer,
        'selfie'
      );

      if (!cardFile.success || !selfieFile.success) {
        res.status(500).json({
          success: false,
          message: 'Failed to save uploaded files',
        });
        return;
      }

      console.log('✅ Files saved. Starting verification...');

      // Perform full Ghana card verification
      const verificationResult = await ghanaCardVerificationService.performFullVerification(
        cardFile.filePath!,
        selfieFile.filePath!
      );

      // Update KYC record with verification results
      const kycUpdate = {
        ghanaCardNumber,
        documentUrl: cardFile.fileUrl, // Ghana card photo
        selfieUrl: selfieFile.fileUrl, // Selfie photo
        dateOfBirth: verificationResult.cardData
          ? new Date(verificationResult.cardData.dateOfBirth)
          : new Date(),
        address: existingKYC?.address || 'Ghana',
        city: existingKYC?.city || 'Accra',
        region: existingKYC?.region || 'Greater Accra',
        status: (verificationResult.success ? 'APPROVED' : 'REJECTED') as KYCStatus,
        reviewedAt: new Date(),
        reviewedBy: 'SYSTEM_AUTO_VERIFIED',
        rejectionReason: verificationResult.success ? null : verificationResult.message,
      };

      // Create or update KYC record
      if (existingKYC) {
        await prisma.kYC.update({
          where: { userId },
          data: kycUpdate,
        });
      } else {
        await prisma.kYC.create({
          data: {
            userId,
            ...kycUpdate,
          },
        });
      }

      // Response
      if (verificationResult.success) {
        console.log(`✅ KYC Auto-Verified for user ${userId}`);
        res.status(200).json({
          success: true,
          message: 'KYC verification completed successfully',
          data: {
            status: 'APPROVED',
            ageVerification: verificationResult.ageVerification,
            facialMatch: verificationResult.facialMatch,
            cardValidity: verificationResult.cardValidity,
            cardData: {
              firstName: verificationResult.cardData?.firstName,
              lastName: verificationResult.cardData?.lastName,
              dateOfBirth: verificationResult.cardData?.dateOfBirth,
              age: verificationResult.ageVerification?.age,
            },
            message: verificationResult.message,
          },
        });
      } else {
        console.log(`❌ KYC Verification Failed for user ${userId}: ${verificationResult.message}`);
        res.status(400).json({
          success: false,
          message: 'KYC verification failed',
          data: {
            status: 'REJECTED',
            reason: verificationResult.message,
            ageVerification: verificationResult.ageVerification,
            facialMatch: verificationResult.facialMatch,
            cardValidity: verificationResult.cardValidity,
          },
        });
      }
    } catch (error: any) {
      console.error('❌ KYC image verification error:', error.message);
      res.status(500).json({
        success: false,
        message: 'KYC verification process failed',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/kyc/verification-status
 * Get detailed KYC verification status including age confirmation
 */
router.get(
  '/kyc/verification-status',
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

      const kyc = await prisma.kYC.findUnique({
        where: { userId },
        select: {
          status: true,
          dateOfBirth: true,
          reviewedAt: true,
          rejectionReason: true,
          documentUrl: true,
          selfieUrl: true,
        },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'No KYC record found',
        });
        return;
      }

      // Calculate age
      let age = null;
      if (kyc.dateOfBirth) {
        const today = new Date();
        age = today.getFullYear() - kyc.dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - kyc.dateOfBirth.getMonth();
        const dayDiff = today.getDate() - kyc.dateOfBirth.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          status: kyc.status,
          isAbove18: age ? age >= 18 : null,
          age,
          dateOfBirth: kyc.dateOfBirth,
          photoUploaded: !!kyc.documentUrl,
          selfieUploaded: !!kyc.selfieUrl,
          verifiedAt: kyc.reviewedAt,
          rejectionReason: kyc.rejectionReason,
        },
      });
    } catch (error: any) {
      console.error('❌ Verification status fetch error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification status',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/kyc/re-verify
 * Allows user to re-submit KYC if previously rejected
 */
router.post(
  '/kyc/re-verify',
  authMiddleware,
  upload.fields([
    { name: 'ghanaCardPhoto', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
  ]),
  async (req: Request & { files?: any }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Check if user has rejected KYC
      const kyc = await prisma.kYC.findUnique({
        where: { userId },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'No KYC record found. Please initiate KYC first.',
        });
        return;
      }

      if (kyc.status !== 'REJECTED') {
        res.status(400).json({
          success: false,
          message: `Cannot re-verify KYC with status: ${kyc.status}`,
        });
        return;
      }

      // Resubmit verification (same logic as verify-with-images)
      // Forward to the same verification endpoint
      const ghanaCardNumber = kyc.ghanaCardNumber;

      if (!req.files?.ghanaCardPhoto || !req.files?.selfiePhoto) {
        res.status(400).json({
          success: false,
          message: 'Both Ghana card photo and selfie photo are required',
        });
        return;
      }

      // Save files
      const cardFile = await fileUploadHelper.saveFileLocally(
        userId,
        req.files.ghanaCardPhoto[0].buffer,
        'card'
      );
      const selfieFile = await fileUploadHelper.saveFileLocally(
        userId,
        req.files.selfiePhoto[0].buffer,
        'selfie'
      );

      if (!cardFile.success || !selfieFile.success) {
        res.status(500).json({
          success: false,
          message: 'Failed to save uploaded files',
        });
        return;
      }

      // Perform verification
      const verificationResult = await ghanaCardVerificationService.performFullVerification(
        cardFile.filePath!,
        selfieFile.filePath!
      );

      // Update KYC
      await prisma.kYC.update({
        where: { userId },
        data: {
          documentUrl: cardFile.fileUrl,
          selfieUrl: selfieFile.fileUrl,
          dateOfBirth: verificationResult.cardData
            ? new Date(verificationResult.cardData.dateOfBirth)
            : kyc.dateOfBirth,
          status: (verificationResult.success ? 'APPROVED' : 'REJECTED') as KYCStatus,
          reviewedAt: new Date(),
          reviewedBy: 'SYSTEM_AUTO_VERIFIED',
          rejectionReason: verificationResult.success ? null : verificationResult.message,
        },
      });

      if (verificationResult.success) {
        res.status(200).json({
          success: true,
          message: 'KYC re-verification successful',
          data: {
            status: 'APPROVED',
            ageVerification: verificationResult.ageVerification,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'KYC re-verification failed',
          data: {
            reason: verificationResult.message,
          },
        });
      }
    } catch (error: any) {
      console.error('❌ KYC re-verification error:', error.message);
      res.status(500).json({
        success: false,
        message: 'KYC re-verification failed',
        error: error.message,
      });
    }
  }
);

export default router;
