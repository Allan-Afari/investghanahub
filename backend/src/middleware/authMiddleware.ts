/**
 * Authentication Middleware for InvestGhanaHub
 * Handles JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { verifyToken } from '../utils/jwt.util';
import { AppError } from '../utils/error.util';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(AppError.unauthorized('Access denied. No token provided.'));
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, email: true, isActive: true }
    });

    if (!user) {
      next(AppError.unauthorized('Invalid token. User not found.'));
      return;
    }

    if (!user.isActive) {
      next(AppError.forbidden('Account has been deactivated. Please contact support.'));
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email
    };

    next();
  } catch (error: any) {
    if (error.message?.includes('expired')) {
      next(AppError.unauthorized('Token has expired. Please login again.'));
      return;
    }

    if (error.message?.includes('Invalid token')) {
      next(AppError.unauthorized('Invalid token.'));
      return;
    }

    next(AppError.unauthorized('Authentication error'));
  }
};

/**
 * Require specific roles
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Admin Role Middleware
 * Ensures user has ADMIN role
 */
export const adminMiddleware = requireRole('ADMIN');

/**
 * Business Owner Role Middleware
 * Ensures user has BUSINESS_OWNER or ADMIN role
 */
export const businessOwnerMiddleware = requireRole('BUSINESS_OWNER', 'ADMIN');

/**
 * Investor Role Middleware
 * Ensures user has INVESTOR or ADMIN role
 */
export const investorMiddleware = requireRole('INVESTOR', 'ADMIN');

/**
 * KYC Verification Middleware
 * Ensures user has approved KYC before performing sensitive operations
 */
export const kycVerifiedMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Admins bypass KYC check
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  try {
    const kyc = await prisma.kYC.findUnique({
      where: { userId: req.user.id }
    });

    if (!kyc) {
      res.status(403).json({
        success: false,
        message: 'KYC verification required. Please submit your KYC documents.'
      });
      return;
    }

    if (kyc.status !== 'APPROVED') {
      res.status(403).json({
        success: false,
        message: `KYC status: ${kyc.status}. Approved KYC required for this action.`
      });
      return;
    }

    next();
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying KYC status'
    });
  }
};

