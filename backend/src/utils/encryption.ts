/**
 * Encryption Utility for InvestGhanaHub
 * Handles encryption/decryption of sensitive data like Ghana Card numbers
 */

import crypto from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Key must be 32 characters for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-this!';
  
  // Ensure key is exactly 32 bytes
  if (key.length !== 32) {
    console.warn('⚠️ ENCRYPTION_KEY should be exactly 32 characters');
  }
  
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

/**
 * Encrypt sensitive data (e.g., Ghana Card numbers)
 * @param plainText - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (base64)
 */
export function encrypt(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV, auth tag, and encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * @param encryptedText - The encrypted string from encrypt()
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask Ghana Card number for display (show only last 4 digits)
 * @param ghanaCard - Full or encrypted Ghana Card number
 * @returns Masked card number like GHA-****-****-1234
 */
export function maskGhanaCard(ghanaCard: string): string {
  // If encrypted, decrypt first
  let cardNumber = ghanaCard;
  
  if (ghanaCard.includes(':')) {
    try {
      cardNumber = decrypt(ghanaCard);
    } catch {
      return 'GHA-****-****-****';
    }
  }
  
  // Ghana Card format: GHA-XXXXXXXXX-X
  const lastFour = cardNumber.slice(-4);
  return `GHA-****-****-${lastFour}`;
}

/**
 * Validate Ghana Card format
 * Ghana Card format: GHA-XXXXXXXXX-X (14 characters with prefix)
 * @param ghanaCard - Ghana Card number to validate
 * @returns Boolean indicating if format is valid
 */
export function validateGhanaCardFormat(ghanaCard: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanCard = ghanaCard.replace(/\s/g, '').toUpperCase();
  
  // Ghana Card regex pattern
  const ghanaCardPattern = /^GHA-\d{9}-\d$/;
  
  return ghanaCardPattern.test(cleanCard);
}

