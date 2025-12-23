/**
 * Capital Raising Registration Routes
 * Simplified flow for business owners to register and start raising capital
 * Combines user registration + KYC + business registration in one guided flow
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { prisma } from '../config/database';
import { authService } from '../services/authService';
import { businessService } from '../services/businessService';
import { ghanaCardVerificationService } from '../services/ghanaCardVerificationService';
import { fileUploadHelper } from '../services/fileUploadHelper';
import { KYCStatus } from '@prisma/client';
import multer from 'multer';
import Joi from 'joi';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
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
// VALIDATION SCHEMAS
// ===========================================

const capitalRaisingRegistrationSchema = Joi.object({
  // User info
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain uppercase, lowercase, number, and special character',
      'string.min': 'Password must be at least 8 characters',
    }),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^(\+233|0)[2-5][0-9]{8}$/).required(),

  // Business info
  businessName: Joi.string().min(3).max(100).required(),
  businessDescription: Joi.string().min(20).max(1000).required(),
  businessCategory: Joi.string()
    .valid('crops', 'startup', 'operational')
    .required(),
  businessLocation: Joi.string().min(3).max(100).required(),
  businessRegion: Joi.string()
    .valid(
      'Greater Accra',
      'Ashanti',
      'Central',
      'Northern',
      'Upper East',
      'Upper West',
      'Volta',
      'Eastern',
      'Western',
      'Bono',
      'Bono East',
      'Ahafo',
      'Savanna'
    )
    .required(),
  targetCapital: Joi.number().min(1000).max(10000000).required(),

  // KYC info
  ghanaCardNumber: Joi.string().min(10).max(20).required(),
});

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/capital-raising/register
 * Complete registration for raising capital (one-shot)
 * No file upload in this version - user details only
 *
 * Request body:
 * {
 *   email, password, firstName, lastName, phone,
 *   businessName, businessDescription, businessCategory, businessLocation, businessRegion, targetCapital,
 *   ghanaCardNumber
 * }
 *
 * Returns: Created user, pending KYC, pending business
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = capitalRaisingRegistrationSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        businessName,
        businessDescription,
        businessCategory,
        businessLocation,
        businessRegion,
        targetCapital,
        ghanaCardNumber,
      } = value;

      // Step 1: Register user as BUSINESS_OWNER
      console.log('📝 Step 1: Registering business owner...');
      const userResult = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'BUSINESS_OWNER',
      });

      const userId = userResult.user.id;
      console.log(`✅ User registered: ${userId}`);

      // Step 2: Create pending KYC record (awaiting document upload)
      console.log('📝 Step 2: Creating KYC record...');
      const kyc = await prisma.kYC.create({
        data: {
          userId,
          ghanaCardNumber,
          status: 'PENDING' as KYCStatus,
          dateOfBirth: new Date(),
          address: businessLocation,
          city: businessLocation,
          region: businessRegion,
        },
      });
      console.log(`✅ KYC created (status: PENDING)`);

      // Step 3: Create pending business
      console.log('📝 Step 3: Creating business...');
      const business = await prisma.business.create({
        data: {
          ownerId: userId,
          name: businessName,
          description: businessDescription,
          category: businessCategory,
          location: businessLocation,
          region: businessRegion,
          targetAmount: targetCapital,
          status: 'PENDING',
        },
      });
      console.log(`✅ Business created (status: PENDING)`);

      // Return combined response
      res.status(201).json({
        success: true,
        message: 'Capital raising registration initiated. Please complete KYC verification.',
        data: {
          user: userResult.user,
          kyc: {
            id: kyc.id,
            status: kyc.status,
            message: 'Upload Ghana card and selfie to complete KYC verification',
          },
          business: {
            id: business.id,
            name: business.name,
            status: business.status,
            message: 'Business awaiting KYC approval, then admin review',
          },
          nextSteps: [
            '1. Complete KYC verification (upload Ghana card + selfie)',
            '2. Admin will review KYC (age verification required)',
            '3. Admin will review and approve your business',
            '4. Create investment opportunities to raise capital',
          ],
        },
      });
    } catch (error: any) {
      console.error('❌ Capital raising registration error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/capital-raising/register-with-kyc
 * Complete registration + KYC verification with image uploads (2-step)
 *
 * Multipart form data:
 * - email, password, firstName, lastName, phone
 * - businessName, businessDescription, businessCategory, businessLocation, businessRegion, targetCapital
 * - ghanaCardNumber
 * - ghanaCardPhoto: File
 * - selfiePhoto: File
 */
router.post(
  '/register-with-kyc',
  upload.fields([
    { name: 'ghanaCardPhoto', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
  ]),
  async (req: Request & { files?: any }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = capitalRaisingRegistrationSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
        });
        return;
      }

      // Validate file uploads
      if (!req.files?.ghanaCardPhoto || !req.files?.selfiePhoto) {
        res.status(400).json({
          success: false,
          message: 'Ghana card photo and selfie photo are required',
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        businessName,
        businessDescription,
        businessCategory,
        businessLocation,
        businessRegion,
        targetCapital,
        ghanaCardNumber,
      } = value;

      // Step 1: Register user
      console.log('📝 Step 1: Registering business owner...');
      const userResult = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'BUSINESS_OWNER',
      });

      const userId = userResult.user.id;
      console.log(`✅ User registered: ${userId}`);

      // Step 2: Save images locally
      console.log('📝 Step 2: Uploading photos...');
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
          message: 'Failed to save photos',
        });
        return;
      }

      console.log(`✅ Photos saved`);

      // Step 3: Perform KYC verification
      console.log('📝 Step 3: Verifying KYC...');
      const verificationResult = await ghanaCardVerificationService.performFullVerification(
        cardFile.filePath!,
        selfieFile.filePath!
      );

      // Step 4: Create KYC record
      console.log('📝 Step 4: Creating KYC record...');
      const kyc = await prisma.kYC.create({
        data: {
          userId,
          ghanaCardNumber,
          documentUrl: cardFile.fileUrl,
          selfieUrl: selfieFile.fileUrl,
          dateOfBirth: verificationResult.cardData
            ? new Date(verificationResult.cardData.dateOfBirth)
            : new Date(),
          address: businessLocation,
          city: businessLocation,
          region: businessRegion,
          status: (verificationResult.success ? 'APPROVED' : 'REJECTED') as KYCStatus,
          reviewedAt: new Date(),
          reviewedBy: 'SYSTEM_AUTO_VERIFIED',
          rejectionReason: verificationResult.success ? null : verificationResult.message,
        },
      });

      console.log(`✅ KYC created (status: ${kyc.status})`);

      // Step 5: Create business
      console.log('📝 Step 5: Creating business...');
      const business = await prisma.business.create({
        data: {
          ownerId: userId,
          name: businessName,
          description: businessDescription,
          category: businessCategory,
          location: businessLocation,
          region: businessRegion,
          targetAmount: targetCapital,
          status: kyc.status === 'APPROVED' ? 'PENDING' : 'PENDING', // Wait for admin review
        },
      });

      console.log(`✅ Business created (status: PENDING - awaiting admin review)`);

      // Return combined response
      if (verificationResult.success) {
        res.status(201).json({
          success: true,
          message: 'Capital raising registration completed. Awaiting admin review.',
          data: {
            user: userResult.user,
            kyc: {
              id: kyc.id,
              status: kyc.status,
              ageVerification: verificationResult.ageVerification,
              message: `KYC auto-verified. Age: ${verificationResult.ageVerification?.age} years (Above 18: ${verificationResult.ageVerification?.isAbove18})`,
            },
            business: {
              id: business.id,
              name: business.name,
              targetCapital,
              status: business.status,
              message:
                'Business awaiting admin review. Once approved, you can create investment opportunities.',
            },
            nextSteps: [
              '1. ✅ KYC verified (auto-approved)',
              '2. ⏳ Waiting for admin review of your business',
              '3. Once approved, create investment opportunities to raise capital',
            ],
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'KYC verification failed',
          data: {
            user: userResult.user,
            kyc: {
              id: kyc.id,
              status: kyc.status,
              reason: verificationResult.message,
              ageVerification: verificationResult.ageVerification,
            },
            message: `Please re-verify: ${verificationResult.message}`,
          },
        });
      }
    } catch (error: any) {
      console.error('❌ Capital raising registration error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/capital-raising/status/:userId
 * Check registration and capital raising status
 */
router.get(
  '/status/:userId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Get KYC status
      const kyc = await prisma.kYC.findUnique({
        where: { userId },
      });

      // Get business status
      const businesses = await prisma.business.findMany({
        where: { ownerId: userId },
      });

      res.status(200).json({
        success: true,
        data: {
          user,
          kyc: {
            status: kyc?.status || 'NOT_STARTED',
            age: kyc?.dateOfBirth
              ? new Date().getFullYear() - kyc.dateOfBirth.getFullYear()
              : null,
            isAbove18:
              kyc?.dateOfBirth &&
              new Date().getFullYear() - kyc.dateOfBirth.getFullYear() >= 18,
          },
          businesses: businesses.map((b) => ({
            id: b.id,
            name: b.name,
            status: b.status,
            targetAmount: b.targetAmount,
          })),
          overallStatus:
            kyc?.status === 'APPROVED' && businesses.length > 0
              ? 'READY_TO_RAISE_CAPITAL'
              : kyc?.status === 'PENDING'
                ? 'KYC_PENDING'
                : 'INCOMPLETE',
        },
      });
    } catch (error: any) {
      console.error('❌ Status check error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to check status',
        error: error.message,
      });
    }
  }
);

export default router;
