/**
 * Authentication Middleware for InvestGhanaHub
 * Handles JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

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
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: Role };

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Admin Role Middleware
 * Ensures user has ADMIN role
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
    return;
  }

  next();
};

/**
 * Business Owner Role Middleware
 * Ensures user has BUSINESS_OWNER role
 */
export const businessOwnerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'BUSINESS_OWNER' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Business owner privileges required.'
    });
    return;
  }

  next();
};

/**
 * Investor Role Middleware
 * Ensures user has INVESTOR role
 */
export const investorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'INVESTOR' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Investor privileges required.'
    });
    return;
  }

  next();
};

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

