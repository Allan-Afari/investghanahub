/**
 * Authentication Service for InvestGhanaHub
 * Handles user registration, login, and profile management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'PREMIUM' | 'REJECTED';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Types
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
}

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  expertise?: string;
  experience?: string;
  website?: string;
  linkedin?: string;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  isPremium: boolean;
  subscriptionTier?: string;
  profileImage?: string;
  bio?: string;
  expertise?: string;
  experience?: string;
  website?: string;
  linkedin?: string;
  createdAt: Date;
  kycStatus?: string;
}

interface AuthResponse {
  user: UserResponse;
  token: string;
}

/**
 * Authentication Service Class
 */
class AuthService {
  /**
   * Register a new user
   * @param data - Registration data
   * @returns User data and JWT token
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      const error = new Error('Email already registered') as any;
      error.statusCode = 400;
      throw error;
    }

    // Hash password with bcrypt (salt rounds: 12)
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role
      }
    });

    // Create audit log for registration
    await this.createAuditLog(user.id, 'REGISTER', 'User', user.id);

    // Generate JWT token
    const token = this.generateToken(user.id, user.role);

    return {
      user: this.formatUserResponse(user),
      token
    };
  }

  /**
   * Authenticate user login
   * @param email - User email
   * @param password - User password
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @returns User data and JWT token
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { kyc: true }
    });

    if (!user) {
      const error = new Error('Invalid email or password') as any;
      error.statusCode = 401;
      throw error;
    }

    // Check if user is active
    if (!user.isActive) {
      const error = new Error('Account has been deactivated. Please contact support.') as any;
      error.statusCode = 403;
      throw error;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Invalid email or password') as any;
      error.statusCode = 401;
      throw error;
    }

    // Create audit log for login
    await this.createAuditLog(user.id, 'LOGIN', 'User', user.id, undefined, ipAddress, userAgent);

    // Generate JWT token
    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        ...this.formatUserResponse(user),
        kycStatus: user.kyc?.status || 'NOT_SUBMITTED'
      },
      token
    };
  }

  /**
   * Get user profile
   * @param userId - User ID
   * @returns User profile data
   */
  async getProfile(userId: string): Promise<UserResponse & { kycStatus: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true }
    });

    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      throw error;
    }

    return {
      ...this.formatUserResponse(user),
      kycStatus: user.kyc?.status || 'NOT_SUBMITTED'
    };
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param data - Profile update data
   * @returns Updated user data
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<UserResponse> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.expertise !== undefined && { expertise: data.expertise }),
        ...(data.experience !== undefined && { experience: data.experience }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.linkedin !== undefined && { linkedin: data.linkedin })
      }
    });

    // Create audit log
    await this.createAuditLog(userId, 'PROFILE_UPDATE', 'User', userId);

    return this.formatUserResponse(user);
  }

  /**
   * Change user password
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      const error = new Error('Current password is incorrect') as any;
      error.statusCode = 400;
      throw error;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Create audit log
    await this.createAuditLog(userId, 'PASSWORD_CHANGE', 'User', userId);
  }

  /**
   * Update user verification status (Admin only)
   * @param userId - User ID to update
   * @param status - New verification status
   * @param adminId - Admin performing the action
   */
  async updateVerificationStatus(userId: string, status: VerificationStatus, adminId: string): Promise<UserResponse> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status } as any
    });

    // Create audit log
    await this.createAuditLog(adminId, 'VERIFICATION_STATUS_UPDATE', 'User', userId, 
      JSON.stringify({ oldStatus: (user as any).verificationStatus, newStatus: status }));

    return this.formatUserResponse(user);
  }

  /**
   * Upgrade user to premium tier
   * @param userId - User ID
   * @param tier - Subscription tier (PREMIUM, VIP)
   * @param duration - Duration in months
   */
  async upgradeToPremium(userId: string, tier: string, duration: number): Promise<UserResponse> {
    const subscriptionEnds = new Date();
    subscriptionEnds.setMonth(subscriptionEnds.getMonth() + duration);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        subscriptionTier: tier,
        subscriptionEnds: subscriptionEnds,
        verificationStatus: tier === 'VIP' ? 'PREMIUM' : 'VERIFIED'
      } as any
    });

    // Create audit log
    await this.createAuditLog(userId, 'PREMIUM_UPGRADE', 'User', userId, 
      JSON.stringify({ tier, duration, subscriptionEnds }));

    return this.formatUserResponse(user);
  }

  /**
   * Get user by verification status for admin purposes
   * @param status - Verification status to filter by
   */
  async getUsersByVerificationStatus(status: VerificationStatus): Promise<UserResponse[]> {
    const users = await prisma.user.findMany({
      where: { verificationStatus: status } as any,
      include: { 
        kyc: {
          select: {
            status: true
          }
        }
      }
    });

    return users.map(user => ({
      ...this.formatUserResponse(user),
      kycStatus: (user as any).kyc?.status || 'NOT_SUBMITTED'
    }));
  }

  /**
   * Generate JWT token
   * @param userId - User ID
   * @param role - User role
   * @returns JWT token string
   */
  private generateToken(userId: string, role: Role): string {
    return jwt.sign(
      { id: userId, role },
      JWT_SECRET as unknown as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  /**
   * Format user response (exclude sensitive data)
   * @param user - User object from database
   * @returns Formatted user response
   */
  private formatUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      verificationStatus: user.verificationStatus || 'UNVERIFIED',
      isPremium: user.isPremium || false,
      subscriptionTier: user.subscriptionTier || null,
      profileImage: user.profileImage || null,
      bio: user.bio || null,
      expertise: user.expertise || null,
      experience: user.experience || null,
      website: user.website || null,
      linkedin: user.linkedin || null,
      createdAt: user.createdAt
    };
  }

  /**
   * Create audit log entry
   * @param userId - User performing the action
   * @param action - Action type
   * @param entity - Entity affected
   * @param entityId - ID of affected entity
   * @param details - Additional details
   * @param ipAddress - Request IP
   * @param userAgent - Request user agent
   */
  private async createAuditLog(
    userId: string,
    action: string,
    entity: string,
    entityId?: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          details,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      // Log but don't throw - audit logging should not break the main flow
      console.warn('⚠️ Failed to create audit log:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

