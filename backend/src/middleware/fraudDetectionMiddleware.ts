/**
 * Fraud Detection Middleware for InvestGhanaHub
 * Detects suspicious investment patterns and creates alerts
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration for fraud detection thresholds
const FRAUD_CONFIG = {
  // Maximum investments allowed in a short time window (1 hour)
  rapidInvestmentThreshold: 5,
  rapidInvestmentWindowMs: 60 * 60 * 1000, // 1 hour

  // High amount threshold (in GHS)
  highAmountThreshold: 100000,

  // Maximum daily investment amount (in GHS)
  maxDailyInvestment: 500000,

  // Risk score thresholds
  lowRiskScore: 30,
  mediumRiskScore: 60,
  highRiskScore: 80
};

/**
 * Fraud Detection Middleware
 * Analyzes investment patterns and flags suspicious activity
 */
export const fraudDetectionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!userId) {
      next();
      return;
    }

    let riskScore = 0;
    const alerts: string[] = [];

    // Check 1: Rapid investments (multiple investments in short time)
    const rapidInvestmentCheck = await checkRapidInvestments(userId);
    if (rapidInvestmentCheck.isRapid) {
      riskScore += 30;
      alerts.push(`${rapidInvestmentCheck.count} investments in the last hour`);
    }

    // Check 2: High amount investment
    if (amount && amount >= FRAUD_CONFIG.highAmountThreshold) {
      riskScore += 25;
      alerts.push(`High investment amount: ${amount} GHS`);
    }

    // Check 3: Daily investment limit exceeded
    const dailyTotal = await getDailyInvestmentTotal(userId);
    if (dailyTotal + (amount || 0) > FRAUD_CONFIG.maxDailyInvestment) {
      riskScore += 35;
      alerts.push(`Daily limit exceeded: ${dailyTotal + (amount || 0)} GHS`);
    }

    // Check 4: Unusual pattern - first large investment
    const userInvestmentHistory = await getUserInvestmentStats(userId);
    if (userInvestmentHistory.count === 0 && amount >= FRAUD_CONFIG.highAmountThreshold / 2) {
      riskScore += 20;
      alerts.push('First investment is unusually large');
    }

    // Check 5: Investment significantly higher than user's average
    if (
      userInvestmentHistory.count > 0 &&
      amount > userInvestmentHistory.averageAmount * 5
    ) {
      riskScore += 20;
      alerts.push('Investment 5x higher than user average');
    }

    // If risk score exceeds threshold, create fraud alert
    if (riskScore >= FRAUD_CONFIG.lowRiskScore) {
      const alertType = getAlertType(alerts);
      const description = generateAlertDescription(alerts, amount, riskScore);

      await prisma.fraudAlert.create({
        data: {
          userId,
          alertType,
          description,
          riskScore
        }
      });

      // Log the fraud detection
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'FRAUD_ALERT_CREATED',
          entity: 'FraudAlert',
          details: JSON.stringify({
            riskScore,
            alerts,
            amount,
            timestamp: new Date().toISOString()
          }),
          ipAddress: req.ip || req.socket.remoteAddress
        }
      });

      // If risk is very high, block the transaction
      if (riskScore >= FRAUD_CONFIG.highRiskScore) {
        res.status(403).json({
          success: false,
          message: 'Transaction blocked due to suspicious activity. Please contact support.',
          code: 'FRAUD_DETECTED'
        });
        return;
      }
    }

    // Continue with the request (investment will proceed with alert logged)
    next();
  } catch (error) {
    console.error('Fraud detection error:', error);
    // Don't block transaction on fraud detection errors
    next();
  }
};

/**
 * Check for rapid investments in the last hour
 */
async function checkRapidInvestments(userId: string): Promise<{ isRapid: boolean; count: number }> {
  const oneHourAgo = new Date(Date.now() - FRAUD_CONFIG.rapidInvestmentWindowMs);

  const recentInvestments = await prisma.investment.count({
    where: {
      investorId: userId,
      createdAt: { gte: oneHourAgo }
    }
  });

  return {
    isRapid: recentInvestments >= FRAUD_CONFIG.rapidInvestmentThreshold,
    count: recentInvestments
  };
}

/**
 * Get total investment amount for today
 */
async function getDailyInvestmentTotal(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.investment.aggregate({
    where: {
      investorId: userId,
      createdAt: { gte: today }
    },
    _sum: { amount: true }
  });

  return result._sum.amount || 0;
}

/**
 * Get user's historical investment statistics
 */
async function getUserInvestmentStats(
  userId: string
): Promise<{ count: number; totalAmount: number; averageAmount: number }> {
  const result = await prisma.investment.aggregate({
    where: { investorId: userId },
    _count: true,
    _sum: { amount: true },
    _avg: { amount: true }
  });

  return {
    count: result._count || 0,
    totalAmount: result._sum.amount || 0,
    averageAmount: result._avg.amount || 0
  };
}

/**
 * Determine alert type based on detected issues
 */
function getAlertType(alerts: string[]): string {
  const alertText = alerts.join(' ').toLowerCase();

  if (alertText.includes('investments in the last hour')) {
    return 'RAPID_INVESTMENTS';
  }
  if (alertText.includes('high investment amount') || alertText.includes('daily limit')) {
    return 'HIGH_AMOUNT';
  }
  return 'SUSPICIOUS_PATTERN';
}

/**
 * Generate human-readable alert description
 */
function generateAlertDescription(alerts: string[], amount: number, riskScore: number): string {
  const riskLevel =
    riskScore >= FRAUD_CONFIG.highRiskScore
      ? 'HIGH'
      : riskScore >= FRAUD_CONFIG.mediumRiskScore
      ? 'MEDIUM'
      : 'LOW';

  return `[${riskLevel} RISK] Investment of ${amount} GHS flagged. Issues: ${alerts.join('; ')}.`;
}

/**
 * Middleware to check KYC status before investment
 * Ensures Ghana compliance - KYC must be approved
 */
export const kycCheckMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const kyc = await prisma.kYC.findUnique({
      where: { userId }
    });

    if (!kyc) {
      res.status(403).json({
        success: false,
        message: 'KYC verification required. Please complete your KYC submission.',
        code: 'KYC_REQUIRED'
      });
      return;
    }

    if (kyc.status === 'PENDING') {
      res.status(403).json({
        success: false,
        message: 'Your KYC is pending approval. Please wait for admin verification.',
        code: 'KYC_PENDING'
      });
      return;
    }

    if (kyc.status === 'REJECTED') {
      res.status(403).json({
        success: false,
        message: `KYC rejected: ${kyc.rejectionReason}. Please resubmit your KYC.`,
        code: 'KYC_REJECTED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('KYC check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying KYC status'
    });
  }
};

/**
 * Rate limiting middleware for investment endpoints
 */
export const investmentRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      next();
      return;
    }

    // Check investments in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentCount = await prisma.investment.count({
      where: {
        investorId: userId,
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentCount >= 3) {
      res.status(429).json({
        success: false,
        message: 'Too many investment requests. Please wait a moment before trying again.',
        code: 'RATE_LIMITED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    next();
  }
};

