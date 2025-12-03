/**
 * Admin Service for InvestGhanaHub
 * Handles admin dashboard, fraud detection, and audit logs
 */

import { PrismaClient, FraudAlertStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Types
interface UserFilters {
  role?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

interface FraudAlertFilters {
  status?: string;
  page: number;
  limit: number;
}

interface AuditLogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
}

interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Admin Service Class
 */
class AdminService {
  /**
   * Get dashboard statistics
   * @returns Dashboard stats
   */
  async getDashboardStats(): Promise<any> {
    const [
      totalUsers,
      totalInvestors,
      totalBusinessOwners,
      totalBusinesses,
      approvedBusinesses,
      pendingBusinesses,
      totalInvestments,
      totalInvested,
      pendingKYCs,
      pendingFraudAlerts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'INVESTOR' } }),
      prisma.user.count({ where: { role: 'BUSINESS_OWNER' } }),
      prisma.business.count(),
      prisma.business.count({ where: { status: 'APPROVED' } }),
      prisma.business.count({ where: { status: 'PENDING' } }),
      prisma.investment.count(),
      prisma.investment.aggregate({ _sum: { amount: true } }),
      prisma.kYC.count({ where: { status: 'PENDING' } }),
      prisma.fraudAlert.count({ where: { status: 'PENDING' } })
    ]);

    // Recent activity
    const recentInvestments = await prisma.investment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        investor: {
          select: { firstName: true, lastName: true }
        },
        opportunity: {
          select: { title: true }
        }
      }
    });

    const recentBusinesses = await prisma.business.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        createdAt: true
      }
    });

    // Investment trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentInvestmentTotal = await prisma.investment.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      _count: true
    });

    return {
      users: {
        total: totalUsers,
        investors: totalInvestors,
        businessOwners: totalBusinessOwners
      },
      businesses: {
        total: totalBusinesses,
        approved: approvedBusinesses,
        pending: pendingBusinesses
      },
      investments: {
        total: totalInvestments,
        totalAmount: totalInvested._sum.amount || 0,
        last30Days: {
          count: recentInvestmentTotal._count,
          amount: recentInvestmentTotal._sum.amount || 0
        }
      },
      pending: {
        kyc: pendingKYCs,
        fraudAlerts: pendingFraudAlerts
      },
      recentActivity: {
        investments: recentInvestments.map(inv => ({
          id: inv.id,
          amount: inv.amount,
          investor: `${inv.investor.firstName} ${inv.investor.lastName}`,
          opportunity: inv.opportunity.title,
          date: inv.createdAt
        })),
        businesses: recentBusinesses
      }
    };
  }

  /**
   * List all users with filters
   * @param filters - Filter options
   * @returns Paginated user list
   */
  async listUsers(filters: UserFilters): Promise<any> {
    const { role, isActive, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          kyc: {
            select: { status: true }
          },
          _count: {
            select: {
              businesses: true,
              investments: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users: users.map(user => ({
        ...user,
        kycStatus: user.kyc?.status || 'NOT_SUBMITTED'
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user details
   * @param id - User ID
   * @returns User details
   */
  async getUserDetails(id: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        kyc: true,
        businesses: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
            targetAmount: true,
            currentAmount: true
          }
        },
        investments: {
          select: {
            id: true,
            amount: true,
            status: true,
            investedAt: true,
            opportunity: {
              select: {
                title: true
              }
            }
          },
          take: 10,
          orderBy: { investedAt: 'desc' }
        },
        _count: {
          select: {
            businesses: true,
            investments: true,
            transactions: true
          }
        }
      }
    });

    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Get investment totals
    const investmentStats = await prisma.investment.aggregate({
      where: { investorId: id },
      _sum: { amount: true, expectedReturn: true }
    });

    return {
      ...user,
      investmentStats: {
        totalInvested: investmentStats._sum.amount || 0,
        totalExpectedReturn: investmentStats._sum.expectedReturn || 0
      }
    };
  }

  /**
   * Update user status (activate/deactivate)
   * @param id - User ID
   * @param isActive - New status
   * @param adminId - Admin performing action
   * @returns Updated user
   */
  async updateUserStatus(id: string, isActive: boolean, adminId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      const error = new Error('User not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Prevent deactivating admin users
    if (user.role === 'ADMIN' && !isActive) {
      const error = new Error('Cannot deactivate admin users') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: id,
        adminId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'User',
        entityId: id
      }
    });

    return updatedUser;
  }

  /**
   * List fraud alerts
   * @param filters - Filter options
   * @returns Paginated fraud alerts
   */
  async listFraudAlerts(filters: FraudAlertFilters): Promise<any> {
    const { status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status as FraudAlertStatus;

    const [alerts, total] = await Promise.all([
      prisma.fraudAlert.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.fraudAlert.count({ where })
    ]);

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get fraud alert details
   * @param id - Alert ID
   * @returns Alert details
   */
  async getFraudAlertDetails(id: string): Promise<any> {
    const alert = await prisma.fraudAlert.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!alert) {
      const error = new Error('Fraud alert not found') as any;
      error.statusCode = 404;
      throw error;
    }

    // Get user's recent investments
    const recentInvestments = await prisma.investment.findMany({
      where: { investorId: alert.userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          select: { title: true }
        }
      }
    });

    return {
      ...alert,
      userInvestments: recentInvestments
    };
  }

  /**
   * Resolve fraud alert
   * @param id - Alert ID
   * @param adminId - Admin ID
   * @param notes - Resolution notes
   * @param action - Resolution action (RESOLVED or DISMISSED)
   * @returns Updated alert
   */
  async resolveFraudAlert(
    id: string,
    adminId: string,
    notes: string,
    action: string
  ): Promise<any> {
    const alert = await prisma.fraudAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      const error = new Error('Fraud alert not found') as any;
      error.statusCode = 404;
      throw error;
    }

    if (alert.status !== 'PENDING') {
      const error = new Error('Alert has already been resolved') as any;
      error.statusCode = 400;
      throw error;
    }

    const updatedAlert = await prisma.fraudAlert.update({
      where: { id },
      data: {
        status: action as FraudAlertStatus,
        resolvedBy: adminId,
        resolvedAt: new Date(),
        resolutionNotes: notes
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: alert.userId,
        adminId,
        action: `FRAUD_ALERT_${action}`,
        entity: 'FraudAlert',
        entityId: id,
        details: JSON.stringify({ notes })
      }
    });

    return updatedAlert;
  }

  /**
   * List audit logs
   * @param filters - Filter options
   * @returns Paginated audit logs
   */
  async listAuditLogs(filters: AuditLogFilters): Promise<any> {
    const { userId, action, entity, startDate, endDate, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };
    if (entity) where.entity = entity;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          admin: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit log details
   * @param id - Log ID
   * @returns Log details
   */
  async getAuditLogDetails(id: string): Promise<any> {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!log) {
      const error = new Error('Audit log not found') as any;
      error.statusCode = 404;
      throw error;
    }

    return log;
  }

  /**
   * Get investment reports
   * @param filters - Report filters
   * @returns Investment report data
   */
  async getInvestmentReports(filters: ReportFilters): Promise<any> {
    const { startDate, endDate, groupBy } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const investments = await prisma.investment.findMany({
      where,
      include: {
        opportunity: {
          include: {
            business: {
              select: { category: true, region: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Aggregate by time period
    const timeGroups: any = {};
    investments.forEach(inv => {
      let key: string;
      const date = new Date(inv.createdAt);
      
      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().substring(0, 10);
          break;
        case 'month':
          key = date.toISOString().substring(0, 7);
          break;
        default: // day
          key = date.toISOString().substring(0, 10);
      }

      if (!timeGroups[key]) {
        timeGroups[key] = { count: 0, amount: 0 };
      }
      timeGroups[key].count++;
      timeGroups[key].amount += inv.amount;
    });

    // Aggregate by category
    const byCategory = investments.reduce((acc: any, inv) => {
      const category = inv.opportunity.business.category;
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0 };
      }
      acc[category].count++;
      acc[category].amount += inv.amount;
      return acc;
    }, {});

    // Aggregate by region
    const byRegion = investments.reduce((acc: any, inv) => {
      const region = inv.opportunity.business.region;
      if (!acc[region]) {
        acc[region] = { count: 0, amount: 0 };
      }
      acc[region].count++;
      acc[region].amount += inv.amount;
      return acc;
    }, {});

    return {
      summary: {
        totalInvestments: investments.length,
        totalAmount: investments.reduce((sum, inv) => sum + inv.amount, 0)
      },
      timeline: Object.entries(timeGroups).map(([date, data]) => ({
        date,
        ...(data as any)
      })),
      byCategory,
      byRegion
    };
  }

  /**
   * Get business reports
   * @returns Business report data
   */
  async getBusinessReports(): Promise<any> {
    const businesses = await prisma.business.findMany({
      include: {
        _count: {
          select: { opportunities: true }
        }
      }
    });

    const byStatus = businesses.reduce((acc: any, bus) => {
      if (!acc[bus.status]) {
        acc[bus.status] = 0;
      }
      acc[bus.status]++;
      return acc;
    }, {});

    const byCategory = businesses.reduce((acc: any, bus) => {
      if (!acc[bus.category]) {
        acc[bus.category] = { count: 0, targetAmount: 0, currentAmount: 0 };
      }
      acc[bus.category].count++;
      acc[bus.category].targetAmount += bus.targetAmount;
      acc[bus.category].currentAmount += bus.currentAmount;
      return acc;
    }, {});

    const byRegion = businesses.reduce((acc: any, bus) => {
      if (!acc[bus.region]) {
        acc[bus.region] = { count: 0, targetAmount: 0, currentAmount: 0 };
      }
      acc[bus.region].count++;
      acc[bus.region].targetAmount += bus.targetAmount;
      acc[bus.region].currentAmount += bus.currentAmount;
      return acc;
    }, {});

    return {
      summary: {
        total: businesses.length,
        totalTarget: businesses.reduce((sum, b) => sum + b.targetAmount, 0),
        totalFunded: businesses.reduce((sum, b) => sum + b.currentAmount, 0)
      },
      byStatus,
      byCategory,
      byRegion
    };
  }

  /**
   * Create a new admin user
   * @param data - Admin user data
   * @param creatorId - ID of admin creating the new admin
   * @returns Created admin user
   */
  async createAdmin(data: CreateAdminData, creatorId: string): Promise<any> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      const error = new Error('Email already registered') as any;
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        adminId: creatorId,
        action: 'ADMIN_CREATED',
        entity: 'User',
        entityId: admin.id
      }
    });

    return admin;
  }
}

// Export singleton instance
export const adminService = new AdminService();

