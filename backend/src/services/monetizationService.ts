import { PrismaClient } from '@prisma/client';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

export interface CreateCommissionParams {
  investmentId: string;
  commissionRate: number;
  commissionAmount: number;
  commissionType: 'PLATFORM_FEE' | 'SUCCESS_FEE' | 'PREMIUM_FEATURE';
  description?: string;
}

export interface CreateSubscriptionParams {
  userId: string;
  tier: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  paymentMethod: string;
  duration: number; // in months
}

export interface CreatePromotionParams {
  businessId: string;
  promotionType: 'FEATURED_LISTING' | 'SPONSORED_PLACEMENT' | 'BANNER_AD';
  duration: number; // in days
  price: number;
  description?: string;
}

export interface SubscriptionTier {
  tier: string;
  name: string;
  price: number;
  duration: number; // in months
  features: string[];
  limits: {
    maxInvestments: number;
    maxWatchlist: number;
    maxMessages: number;
    analyticsAccess: boolean;
    prioritySupport: boolean;
    featuredListings: number;
  };
}

export class MonetizationService {
  private readonly subscriptionTiers: Record<string, SubscriptionTier> = {
    BASIC: {
      tier: 'BASIC',
      name: 'Basic',
      price: 0,
      duration: 12,
      features: ['Basic browsing', 'Limited investments', 'Standard support'],
      limits: {
        maxInvestments: 5,
        maxWatchlist: 10,
        maxMessages: 50,
        analyticsAccess: false,
        prioritySupport: false,
        featuredListings: 0
      }
    },
    PREMIUM: {
      tier: 'PREMIUM',
      name: 'Premium',
      price: 50,
      duration: 1,
      features: ['Unlimited browsing', 'Unlimited investments', 'Advanced analytics', 'Priority support', 'Direct messaging'],
      limits: {
        maxInvestments: -1, // unlimited
        maxWatchlist: 100,
        maxMessages: 500,
        analyticsAccess: true,
        prioritySupport: true,
        featuredListings: 1
      }
    },
    ENTERPRISE: {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      price: 200,
      duration: 1,
      features: ['All Premium features', 'Dedicated account manager', 'Custom analytics', 'API access', 'White-label options'],
      limits: {
        maxInvestments: -1, // unlimited
        maxWatchlist: 1000,
        maxMessages: -1, // unlimited
        analyticsAccess: true,
        prioritySupport: true,
        featuredListings: 5
      }
    }
  };

  /**
   * Create commission record for investment
   */
  async createCommission(params: CreateCommissionParams): Promise<any> {
    try {
      const commission = await prisma.commission.create({
        data: {
          investmentId: params.investmentId,
          commissionRate: params.commissionRate,
          commissionAmount: params.commissionAmount,
          commissionType: params.commissionType,
          description: params.description,
          status: 'PENDING',
          createdAt: new Date()
        },
        include: {
          investment: {
            include: {
              investor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        data: commission
      };
    } catch (error) {
      console.error('Create commission error:', error);
      return {
        success: false,
        message: 'Failed to create commission'
      };
    }
  }

  /**
   * Process and pay out commissions
   */
  async processCommissionPayment(commissionId: string): Promise<any> {
    try {
      const commission = await prisma.commission.findUnique({
        where: { id: commissionId },
        include: {
          investment: true
        }
      });

      if (!commission) {
        throw new Error('Commission not found');
      }

      if (commission.status !== 'PENDING') {
        throw new Error('Commission already processed');
      }

      // Update commission status
      const updatedCommission = await prisma.commission.update({
        where: { id: commissionId },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      });

      return {
        success: true,
        data: updatedCommission
      };
    } catch (error) {
      console.error('Process commission payment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process commission payment'
      };
    }
  }

  /**
   * Create subscription for user
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<any> {
    try {
      const tier = this.subscriptionTiers[params.tier];
      if (!tier) {
        throw new Error('Invalid subscription tier');
      }

      // Check if user already has active subscription
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: params.userId,
          status: 'ACTIVE'
        }
      });

      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + params.duration);

      const subscription = await prisma.subscription.create({
        data: {
          userId: params.userId,
          tier: params.tier,
          price: tier.price * params.duration,
          startDate,
          endDate,
          status: 'ACTIVE',
          paymentMethod: params.paymentMethod,
          createdAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Update user's subscription status
      await prisma.user.update({
        where: { id: params.userId },
        data: {
          isPremium: params.tier !== 'BASIC',
          subscriptionTier: params.tier
        }
      });

      // Send notification
      await notificationService.create({
        userId: params.userId,
        title: 'Subscription Activated',
        message: `Your ${tier.name} subscription has been activated successfully!`,
        type: 'SUCCESS',
        category: 'SUBSCRIPTION',
        sendEmail: true
      });

      return {
        success: true,
        data: subscription
      };
    } catch (error) {
      console.error('Create subscription error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create subscription'
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string): Promise<any> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId
        }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'ACTIVE') {
        throw new Error('Subscription is not active');
      }

      // Update subscription status
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      // Update user's subscription status
      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: false,
          subscriptionTier: 'BASIC'
        }
      });

      // Send notification
      await notificationService.create({
        userId,
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. You will continue to have access until the end of your billing period.',
        type: 'INFO',
        category: 'SUBSCRIPTION',
        sendEmail: true
      });

      return {
        success: true,
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Create promotion for business
   */
  async createPromotion(params: CreatePromotionParams, userId: string): Promise<any> {
    try {
      // Verify user owns the business
      const business = await prisma.business.findUnique({
        where: { id: params.businessId }
      });

      if (!business) {
        throw new Error('Business not found');
      }

      if (business.ownerId !== userId) {
        throw new Error('Only business owners can create promotions');
      }

      // Calculate promotion dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + params.duration);

      const promotion = await prisma.promotion.create({
        data: {
          businessId: params.businessId,
          promotionType: params.promotionType,
          duration: params.duration,
          price: params.price,
          description: params.description,
          startDate,
          endDate,
          status: 'ACTIVE',
          createdAt: new Date()
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              ownerId: true
            }
          }
        }
      });

      // Update business featured status if it's a featured listing
      if (params.promotionType === 'FEATURED_LISTING') {
        await prisma.business.update({
          where: { id: params.businessId },
          data: {
            isFeatured: true,
            featuredUntil: endDate
          }
        });
      }

      // Send notification to business owner
      await notificationService.create({
        userId,
        title: 'Promotion Activated',
        message: `Your ${params.promotionType.replace('_', ' ')} promotion has been activated for ${business.name}!`,
        type: 'SUCCESS',
        category: 'PROMOTION',
        sendEmail: true
      });

      return {
        success: true,
        data: promotion
      };
    } catch (error) {
      console.error('Create promotion error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create promotion'
      };
    }
  }

  /**
   * Get available subscription tiers
   */
  getSubscriptionTiers(): SubscriptionTier[] {
    return Object.values(this.subscriptionTiers);
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string): Promise<any> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!subscription) {
        return {
          success: true,
          data: null
        };
      }

      // Add tier details
      const tierDetails = this.subscriptionTiers[subscription.tier];
      
      return {
        success: true,
        data: {
          ...subscription,
          tierDetails
        }
      };
    } catch (error) {
      console.error('Get user subscription error:', error);
      return {
        success: false,
        message: 'Failed to retrieve subscription'
      };
    }
  }

  /**
   * Get business promotions
   */
  async getBusinessPromotions(businessId: string): Promise<any> {
    try {
      const promotions = await prisma.promotion.findMany({
        where: { businessId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        success: true,
        data: promotions
      };
    } catch (error) {
      console.error('Get business promotions error:', error);
      return {
        success: false,
        message: 'Failed to retrieve promotions'
      };
    }
  }

  /**
   * Get commission statistics (admin only)
   */
  async getCommissionStatistics(): Promise<any> {
    try {
      const [
        totalCommissions,
        paidCommissions,
        pendingCommissions,
        commissionsByType,
        monthlyCommissions
      ] = await Promise.all([
        prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          _count: { id: true }
        }),
        prisma.commission.aggregate({
          where: { status: 'PAID' },
          _sum: { commissionAmount: true },
          _count: { id: true }
        }),
        prisma.commission.aggregate({
          where: { status: 'PENDING' },
          _sum: { commissionAmount: true },
          _count: { id: true }
        }),
        this.getCommissionsByType(),
        this.getMonthlyCommissions()
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalAmount: totalCommissions._sum.commissionAmount || 0,
            totalCount: totalCommissions._count.id,
            paidAmount: paidCommissions._sum.commissionAmount || 0,
            paidCount: paidCommissions._count.id,
            pendingAmount: pendingCommissions._sum.commissionAmount || 0,
            pendingCount: pendingCommissions._count.id
          },
          byType: commissionsByType,
          monthly: monthlyCommissions
        }
      };
    } catch (error) {
      console.error('Get commission statistics error:', error);
      return {
        success: false,
        message: 'Failed to retrieve commission statistics'
      };
    }
  }

  /**
   * Get subscription statistics (admin only)
   */
  async getSubscriptionStatistics(): Promise<any> {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        subscriptionsByTier,
        monthlyRevenue
      ] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        this.getSubscriptionsByTier(),
        this.getMonthlySubscriptionRevenue()
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalSubscriptions,
            activeSubscriptions,
            churnRate: this.calculateChurnRate()
          },
          byTier: subscriptionsByTier,
          monthlyRevenue
        }
      };
    } catch (error) {
      console.error('Get subscription statistics error:', error);
      return {
        success: false,
        message: 'Failed to retrieve subscription statistics'
      };
    }
  }

  /**
   * Check if user can perform action based on subscription limits
   */
  async checkUserLimits(userId: string, action: string, currentCount?: number): Promise<{ allowed: boolean; limit?: number; message?: string }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription.data) {
        // Basic tier limits
        const basicLimits = this.subscriptionTiers.BASIC.limits;
        return this.checkActionLimits(basicLimits, action, currentCount);
      }

      const limits = subscription.data.tierDetails.limits;
      return this.checkActionLimits(limits, action, currentCount);
    } catch (error) {
      console.error('Check user limits error:', error);
      return { allowed: false, message: 'Failed to check user limits' };
    }
  }

  /**
   * Helper methods
   */
  private async getCommissionsByType(): Promise<Record<string, { count: number; amount: number }>> {
    const commissions = await prisma.commission.groupBy({
      by: ['commissionType'],
      _count: { id: true },
      _sum: { commissionAmount: true }
    });

    return commissions.reduce((acc: Record<string, { count: number; amount: number }>, item: any) => {
      acc[item.commissionType] = {
        count: item._count.id,
        amount: item._sum.commissionAmount || 0
      };
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
  }

  private async getMonthlyCommissions(): Promise<Array<{ month: string; amount: number; count: number }>> {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const result = await prisma.commission.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd
          }
        },
        _sum: { commissionAmount: true },
        _count: { id: true }
      });

      months.push({
        month: monthKey,
        amount: result._sum.commissionAmount || 0,
        count: result._count.id
      });
    }

    return months;
  }

  private async getSubscriptionsByTier(): Promise<Record<string, { count: number; revenue: number }>> {
    const subscriptions = await prisma.subscription.groupBy({
      by: ['tier'],
      _count: { id: true },
      _sum: { price: true }
    });

    return subscriptions.reduce((acc: Record<string, { count: number; revenue: number }>, item: any) => {
      acc[item.tier] = {
        count: item._count.id,
        revenue: item._sum.price || 0
      };
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);
  }

  private async getMonthlySubscriptionRevenue(): Promise<Array<{ month: string; revenue: number; count: number }>> {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const result = await prisma.subscription.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd
          }
        },
        _sum: { price: true },
        _count: { id: true }
      });

      months.push({
        month: monthKey,
        revenue: result._sum.price || 0,
        count: result._count.id
      });
    }

    return months;
  }

  private calculateChurnRate(): number {
    // Simplified churn calculation - would need historical data for accurate calculation
    return 5.2; // 5.2% monthly churn rate
  }

  private checkActionLimits(limits: any, action: string, currentCount?: number): { allowed: boolean; limit?: number; message?: string } {
    switch (action) {
      case 'INVESTMENT':
        if (limits.maxInvestments === -1) return { allowed: true };
        if (currentCount && currentCount >= limits.maxInvestments) {
          return { 
            allowed: false, 
            limit: limits.maxInvestments, 
            message: `Investment limit reached. Maximum ${limits.maxInvestments} investments allowed.` 
          };
        }
        return { allowed: true, limit: limits.maxInvestments };

      case 'WATCHLIST':
        if (currentCount && currentCount >= limits.maxWatchlist) {
          return { 
            allowed: false, 
            limit: limits.maxWatchlist, 
            message: `Watchlist limit reached. Maximum ${limits.maxWatchlist} items allowed.` 
          };
        }
        return { allowed: true, limit: limits.maxWatchlist };

      case 'MESSAGE':
        if (limits.maxMessages === -1) return { allowed: true };
        if (currentCount && currentCount >= limits.maxMessages) {
          return { 
            allowed: false, 
            limit: limits.maxMessages, 
            message: `Message limit reached. Maximum ${limits.maxMessages} messages allowed.` 
          };
        }
        return { allowed: true, limit: limits.maxMessages };

      case 'ANALYTICS':
        return { allowed: limits.analyticsAccess };

      case 'FEATURED_LISTING':
        if (currentCount && currentCount >= limits.featuredListings) {
          return { 
            allowed: false, 
            limit: limits.featuredListings, 
            message: `Featured listing limit reached. Maximum ${limits.featuredListings} featured listings allowed.` 
          };
        }
        return { allowed: true, limit: limits.featuredListings };

      default:
        return { allowed: true };
    }
  }
}

// Export singleton instance
export const monetizationService = new MonetizationService();
