/**
 * Watchlist Service for InvestGhanaHub
 * Handles user watchlists for saving businesses they're interested in
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types
interface WatchlistItem {
  id: string;
  userId: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    description: string;
    category: string;
    stage?: string;
    targetAmount: number;
    currentAmount: number;
    status: string;
    createdAt: Date;
  };
  createdAt: Date;
}

interface AddToWatchlistData {
  userId: string;
  businessId: string;
}

/**
 * Watchlist Service Class
 */
class WatchlistService {
  /**
   * Add a business to user's watchlist
   * @param data - Watchlist data
   * @returns Watchlist item
   */
  async addToWatchlist(data: AddToWatchlistData): Promise<WatchlistItem> {
    // Check if business exists
    const business = await prisma.business.findUnique({
      where: { id: data.businessId }
    });

    if (!business) {
      const error = new Error('Business not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_businessId: {
          userId: data.userId,
          businessId: data.businessId
        }
      }
    });

    if (existing) {
      const error = new Error('Business already in watchlist') as any;
      error.statusCode = 409;
      throw error;
    }

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId: data.userId,
        businessId: data.businessId
      },
      include: {
        business: true
      }
    });

    return this.formatWatchlistItem(watchlistItem);
  }

  /**
   * Remove a business from user's watchlist
   * @param userId - User ID
   * @param businessId - Business ID
   */
  async removeFromWatchlist(userId: string, businessId: string): Promise<void> {
    const watchlistItem = await prisma.watchlist.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!watchlistItem) {
      const error = new Error('Watchlist item not found') as any;
      error.statusCode = 404;
      throw error;
    }

    await prisma.watchlist.delete({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });
  }

  /**
   * Get user's watchlist
   * @param userId - User ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated watchlist
   */
  async getUserWatchlist(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    items: WatchlistItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.watchlist.findMany({
        where: { userId },
        include: {
          business: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.watchlist.count({
        where: { userId }
      })
    ]);

    return {
      items: items.map(item => this.formatWatchlistItem(item)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if a business is in user's watchlist
   * @param userId - User ID
   * @param businessId - Business ID
   * @returns Boolean indicating if business is watched
   */
  async isBusinessWatched(userId: string, businessId: string): Promise<boolean> {
    const watchlistItem = await prisma.watchlist.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    return !!watchlistItem;
  }

  /**
   * Get watchlist statistics for a user
   * @param userId - User ID
   * @returns Watchlist statistics
   */
  async getWatchlistStats(userId: string): Promise<{
    totalWatched: number;
    byCategory: { category: string; count: number }[];
    byStage: { stage: string; count: number }[];
    recentlyAdded: WatchlistItem[];
  }> {
    const [totalWatched, byCategory, byStage, recentlyAdded] = await Promise.all([
      prisma.watchlist.count({
        where: { userId }
      }),
      prisma.watchlist.groupBy({
        by: ['businessId'],
        where: { userId },
        _count: true
      }).then(async (results) => {
        const businessIds = results.map(r => r.businessId as string);
        const businesses = await prisma.business.findMany({
          where: { id: { in: businessIds } },
          select: { id: true, category: true }
        });
        
        const categoryMap = new Map<string, number>();
        businesses.forEach(business => {
          categoryMap.set(business.category, (categoryMap.get(business.category) || 0) + 1);
        });
        
        return Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count
        }));
      }),
      prisma.watchlist.groupBy({
        by: ['businessId'],
        where: { userId },
        _count: true
      }).then(async (results) => {
        const businessIds = results.map(r => r.businessId as string);
        const businesses = await prisma.business.findMany({
          where: { id: { in: businessIds } },
          select: { id: true, stage: true }
        });
        
        const stageMap = new Map<string, number>();
        businesses.forEach(business => {
          const stage = (business as any).stage || 'UNKNOWN';
          stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
        });
        
        return Array.from(stageMap.entries()).map(([stage, count]) => ({
          stage,
          count
        }));
      }),
      prisma.watchlist.findMany({
        where: { userId },
        include: {
          business: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).then(items => items.map(item => this.formatWatchlistItem(item)))
    ]);

    return {
      totalWatched,
      byCategory,
      byStage,
      recentlyAdded
    };
  }

  /**
   * Format watchlist item for response
   * @param item - Watchlist item from database
   * @returns Formatted watchlist item
   */
  private formatWatchlistItem(item: any): WatchlistItem {
    return {
      id: item.id,
      userId: item.userId,
      businessId: item.businessId,
      business: {
        id: item.business.id,
        name: item.business.name,
        description: item.business.description,
        category: item.business.category,
        stage: item.business.stage,
        targetAmount: item.business.targetAmount,
        currentAmount: item.business.currentAmount,
        status: item.business.status,
        createdAt: item.business.createdAt
      },
      createdAt: item.createdAt
    };
  }
}

// Export singleton instance
export const watchlistService = new WatchlistService();
