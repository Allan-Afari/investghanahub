/**
 * File Upload Service for InvestGhanaHub
 * Handles document and image uploads using Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png and .webp formats are allowed'));
  }
};

// File filter for documents (images + PDF)
const documentFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png and .pdf formats are allowed'));
  }
};

// Multer upload configurations
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Upload Service Class
 */
class UploadService {
  /**
   * Upload image to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'investghanahub'
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error('Failed to upload image'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload KYC document to Cloudinary
   */
  async uploadKYCDocument(
    file: Express.Multer.File,
    userId: string,
    documentType: 'ghana_card' | 'selfie' | 'other'
  ): Promise<{ url: string; publicId: string }> {
    const folder = `investghanahub/kyc/${userId}`;
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // Allows images and PDFs
          public_id: `${documentType}_${Date.now()}`,
          transformation: file.mimetype.startsWith('image/') 
            ? [{ width: 1500, height: 1500, crop: 'limit' }, { quality: 'auto:good' }]
            : undefined,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary KYC upload error:', error);
            reject(new Error('Failed to upload document'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(
    file: Express.Multer.File,
    userId: string
  ): Promise<{ url: string; publicId: string }> {
    const folder = `investghanahub/profiles`;
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          public_id: `profile_${userId}`,
          overwrite: true,
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary profile upload error:', error);
            reject(new Error('Failed to upload profile picture'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload business document/image
   */
  async uploadBusinessDocument(
    file: Express.Multer.File,
    businessId: string,
    documentType: string
  ): Promise<{ url: string; publicId: string }> {
    const folder = `investghanahub/businesses/${businessId}`;
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          public_id: `${documentType}_${Date.now()}`,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary business upload error:', error);
            reject(new Error('Failed to upload document'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const uploadService = new UploadService();

