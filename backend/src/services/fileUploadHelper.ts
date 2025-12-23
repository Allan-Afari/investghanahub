/**
 * File Upload Helper for KYC
 * Handles Ghana card and selfie photo uploads
 * Stores files locally or uploads to cloud storage (Cloudinary/S3)
 */

import fs from 'fs';
import path from 'path';
import { Request } from 'express';

interface FileUploadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

class FileUploadHelper {
  private uploadDir: string = path.join(process.cwd(), 'uploads', 'kyc');

  constructor() {
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Validate file type - only allow image files
   */
  isValidImageFile(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return validTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Validate file size - max 5MB
   */
  isValidFileSize(buffer: Buffer): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return buffer.length <= maxSize;
  }

  /**
   * Generate unique filename
   */
  generateFileName(userId: string, fileType: 'card' | 'selfie'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}_${fileType}_${timestamp}_${random}.jpg`;
  }

  /**
   * Save file locally
   */
  async saveFileLocally(
    userId: string,
    buffer: Buffer,
    fileType: 'card' | 'selfie'
  ): Promise<FileUploadResult> {
    try {
      const fileName = this.generateFileName(userId, fileType);
      const filePath = path.join(this.uploadDir, fileName);

      // Save file
      fs.writeFileSync(filePath, buffer);

      // Generate accessible URL (for development)
      const fileUrl = `/uploads/kyc/${fileName}`;

      console.log(`✅ File saved: ${fileName}`);

      return {
        success: true,
        filePath,
        fileUrl,
        fileName,
      };
    } catch (error: any) {
      console.error('❌ File save error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload to Cloudinary (production)
   * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
   */
  async uploadToCloudinary(
    buffer: Buffer,
    fileName: string
  ): Promise<FileUploadResult> {
    try {
      // Check if Cloudinary is configured
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        console.warn('⚠️ Cloudinary not configured. Falling back to local storage.');
        return {
          success: false,
          error: 'Cloudinary not configured',
        };
      }

      // In production: use cloudinary npm package
      // import cloudinary from 'cloudinary';
      // cloudinary.config({
      //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      //   api_key: process.env.CLOUDINARY_API_KEY,
      //   api_secret: process.env.CLOUDINARY_API_SECRET,
      // });
      // const result = await cloudinary.uploader.upload_stream(...)

      // For now, return local storage path
      return {
        success: false,
        error: 'Cloudinary upload not implemented',
      };
    } catch (error: any) {
      console.error('❌ Cloudinary upload error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete file (for cleanup)
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ File deleted: ${filePath}`);
      }
    } catch (error: any) {
      console.error('⚠️ File deletion error:', error.message);
    }
  }
}

export const fileUploadHelper = new FileUploadHelper();
