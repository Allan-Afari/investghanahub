/**
 * Ghana Card Verification Service
 * Handles OCR extraction from Ghana card images and age verification
 * Integrates with image processing and identity verification services
 */

import fs from 'fs';
import path from 'path';

/**
 * Ghana Card data extracted from image
 */
interface GhanaCardData {
  cardNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  issuedDate: string;
  expiryDate: string;
}

/**
 * Age verification result
 */
interface AgeVerificationResult {
  isAbove18: boolean;
  dateOfBirth: Date;
  age: number;
  verified: boolean;
  message: string;
}

class GhanaCardVerificationService {
  /**
   * Mock OCR: Extract Ghana Card data from image
   * In production, integrate with Tesseract.js, AWS Textract, or Google Vision API
   */
  async extractGhanaCardData(
    imagePath: string
  ): Promise<GhanaCardData | null> {
    try {
      // Verify file exists
      if (!fs.existsSync(imagePath)) {
        console.warn(`⚠️ Ghana card image not found: ${imagePath}`);
        return null;
      }

      // Mock extraction - in production, use OCR
      // For demo: Generate realistic mock data based on filename or return preset
      const mockData: GhanaCardData = {
        cardNumber: 'GHA-1234567890',
        firstName: 'Kofi',
        lastName: 'Mensah',
        dateOfBirth: '1990-01-15', // This will be extracted from card in production
        gender: 'M',
        issuedDate: '2020-06-10',
        expiryDate: '2025-06-10',
      };

      console.log('📋 Ghana Card OCR - Mock Data Extracted:', mockData);
      return mockData;
    } catch (error: any) {
      console.error('❌ Ghana Card extraction error:', error.message);
      throw new Error(`Failed to extract Ghana card data: ${error.message}`);
    }
  }

  /**
   * Verify user age from Ghana card date of birth
   * Returns true if user is 18 or older
   */
  async verifyAge(cardData: GhanaCardData): Promise<AgeVerificationResult> {
    try {
      // Parse date of birth from Ghana card data
      const dob = new Date(cardData.dateOfBirth);

      if (isNaN(dob.getTime())) {
        return {
          isAbove18: false,
          dateOfBirth: new Date(),
          age: 0,
          verified: false,
          message: 'Invalid date of birth format',
        };
      }

      // Calculate age
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();

      // Adjust if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      const isAbove18 = age >= 18;

      console.log(`📊 Age Verification: ${age} years old - ${isAbove18 ? 'APPROVED' : 'REJECTED'}`);

      return {
        isAbove18,
        dateOfBirth: dob,
        age,
        verified: true,
        message: isAbove18
          ? `User is ${age} years old - Above 18 ✅`
          : `User is ${age} years old - Below 18 ❌`,
      };
    } catch (error: any) {
      console.error('❌ Age verification error:', error.message);
      throw new Error(`Failed to verify age: ${error.message}`);
    }
  }

  /**
   * Perform facial recognition to match Ghana card photo with selfie
   * Returns true if faces match (confidence > threshold)
   * In production: integrate with AWS Rekognition, Google Cloud Vision, or Kairos
   */
  async verifyFacialMatch(
    cardPhotoPath: string,
    selfiePhotoPath: string,
    confidenceThreshold: number = 0.85
  ): Promise<{ isMatch: boolean; confidence: number; message: string }> {
    try {
      // Verify both files exist
      if (!fs.existsSync(cardPhotoPath) || !fs.existsSync(selfiePhotoPath)) {
        console.warn('⚠️ One or both photo files not found');
        return {
          isMatch: false,
          confidence: 0,
          message: 'One or both photo files missing',
        };
      }

      // Mock facial recognition - in production, use AWS Rekognition, Google Vision, etc.
      // Generate a mock confidence score between 0.7 and 0.99
      const mockConfidence = 0.92;
      const isMatch = mockConfidence >= confidenceThreshold;

      console.log(
        `🔍 Facial Recognition - Mock Confidence: ${(mockConfidence * 100).toFixed(2)}% - ${
          isMatch ? 'MATCH ✅' : 'NO MATCH ❌'
        }`
      );

      return {
        isMatch,
        confidence: mockConfidence,
        message: isMatch
          ? `Faces match with ${(mockConfidence * 100).toFixed(2)}% confidence`
          : `Faces do not match (confidence: ${(mockConfidence * 100).toFixed(2)}%)`,
      };
    } catch (error: any) {
      console.error('❌ Facial matching error:', error.message);
      throw new Error(`Failed to verify facial match: ${error.message}`);
    }
  }

  /**
   * Validate Ghana card expiry
   */
  async validateCardExpiry(cardData: GhanaCardData): Promise<{
    isValid: boolean;
    message: string;
  }> {
    try {
      const expiryDate = new Date(cardData.expiryDate);
      const today = new Date();

      const isValid = expiryDate > today;

      return {
        isValid,
        message: isValid
          ? `Card is valid until ${expiryDate.toDateString()}`
          : `Card expired on ${expiryDate.toDateString()}`,
      };
    } catch (error: any) {
      return {
        isValid: false,
        message: `Failed to validate card expiry: ${error.message}`,
      };
    }
  }

  /**
   * Comprehensive Ghana Card verification
   * Validates card data, age, expiry, and facial match
   */
  async performFullVerification(
    cardImagePath: string,
    selfieImagePath: string
  ): Promise<{
    success: boolean;
    cardData?: GhanaCardData;
    ageVerification?: AgeVerificationResult;
    facialMatch?: { isMatch: boolean; confidence: number; message: string };
    cardValidity?: { isValid: boolean; message: string };
    overallStatus: string;
    message: string;
  }> {
    try {
      // Step 1: Extract Ghana card data
      console.log('🔄 Step 1: Extracting Ghana card data...');
      const cardData = await this.extractGhanaCardData(cardImagePath);
      if (!cardData) {
        return {
          success: false,
          overallStatus: 'FAILED',
          message: 'Failed to extract Ghana card data',
        };
      }

      // Step 2: Verify card expiry
      console.log('🔄 Step 2: Validating card expiry...');
      const cardValidity = await this.validateCardExpiry(cardData);
      if (!cardValidity.isValid) {
        return {
          success: false,
          cardData,
          cardValidity,
          overallStatus: 'REJECTED',
          message: `Ghana card is expired: ${cardValidity.message}`,
        };
      }

      // Step 3: Verify age
      console.log('🔄 Step 3: Verifying age...');
      const ageVerification = await this.verifyAge(cardData);
      if (!ageVerification.isAbove18) {
        return {
          success: false,
          cardData,
          ageVerification,
          cardValidity,
          overallStatus: 'REJECTED',
          message: `User is below 18 years old: ${ageVerification.message}`,
        };
      }

      // Step 4: Verify facial match
      console.log('🔄 Step 4: Verifying facial match...');
      const facialMatch = await this.verifyFacialMatch(
        cardImagePath,
        selfieImagePath
      );
      if (!facialMatch.isMatch) {
        return {
          success: false,
          cardData,
          ageVerification,
          cardValidity,
          facialMatch,
          overallStatus: 'REJECTED',
          message: `Facial verification failed: ${facialMatch.message}`,
        };
      }

      // All checks passed
      console.log('✅ Ghana Card Verification - All checks PASSED');
      return {
        success: true,
        cardData,
        ageVerification,
        facialMatch,
        cardValidity,
        overallStatus: 'APPROVED',
        message: 'Ghana Card verification successful. User is above 18 and verified.',
      };
    } catch (error: any) {
      console.error('❌ Full verification error:', error.message);
      return {
        success: false,
        overallStatus: 'ERROR',
        message: `Verification process failed: ${error.message}`,
      };
    }
  }
}

export const ghanaCardVerificationService = new GhanaCardVerificationService();
