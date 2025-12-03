/**
 * Notification Service for InvestGhanaHub
 * Handles in-app notifications
 */

import { PrismaClient } from '@prisma/client';
import { emailService } from './emailService';
import { smsService } from './smsService';

const prisma = new PrismaClient();

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
type NotificationCategory = 'KYC' | 'INVESTMENT' | 'TRANSACTION' | 'SYSTEM' | 'BUSINESS';

interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  link?: string;
  sendEmail?: boolean;
  sendSMS?: boolean;
}

/**
 * Notification Service Class
 */
class NotificationService {
  /**
   * Create a new notification
   */
  async create(data: CreateNotificationData): Promise<void> {
    try {
      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category,
          link: data.link,
        },
      });

      // Get user details for email/SMS
      if (data.sendEmail || data.sendSMS) {
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
        });

        if (user) {
          // Send email notification
          if (data.sendEmail && user.email) {
            await emailService.sendOTPEmail(
              user.email,
              user.firstName,
              data.title,
              data.message
            );
          }

          // Send SMS notification
          if (data.sendSMS && user.phone) {
            await smsService.sendSMS(user.phone, `${data.title}: ${data.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Create notification error:', error);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  // ============================================
  // PRE-BUILT NOTIFICATION TEMPLATES
  // ============================================

  /**
   * Send KYC approved notification
   */
  async notifyKYCApproved(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.create({
      userId,
      title: 'KYC Approved! ✅',
      message: 'Congratulations! Your identity has been verified. You can now make investments.',
      type: 'SUCCESS',
      category: 'KYC',
      link: '/investor',
      sendEmail: true,
      sendSMS: true,
    });

    // Also send dedicated KYC email
    await emailService.sendKYCApprovedEmail(user.email, user.firstName);
    if (user.phone) {
      await smsService.sendKYCStatusAlert(user.phone, 'APPROVED');
    }
  }

  /**
   * Send KYC rejected notification
   */
  async notifyKYCRejected(userId: string, reason: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.create({
      userId,
      title: 'KYC Verification Failed',
      message: `Your KYC was not approved. Reason: ${reason}. Please resubmit.`,
      type: 'ERROR',
      category: 'KYC',
      link: '/kyc',
    });

    await emailService.sendKYCRejectedEmail(user.email, user.firstName, reason);
    if (user.phone) {
      await smsService.sendKYCStatusAlert(user.phone, 'REJECTED', reason);
    }
  }

  /**
   * Send investment confirmation notification
   */
  async notifyInvestmentMade(
    userId: string,
    amount: number,
    opportunityTitle: string,
    businessName: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.create({
      userId,
      title: 'Investment Confirmed! 💰',
      message: `You've invested ₵${amount.toLocaleString()} in ${opportunityTitle} by ${businessName}`,
      type: 'SUCCESS',
      category: 'INVESTMENT',
      link: '/investor',
    });

    await emailService.sendInvestmentConfirmationEmail(
      user.email,
      user.firstName,
      amount,
      opportunityTitle,
      businessName
    );

    if (user.phone) {
      await smsService.sendInvestmentAlert(user.phone, amount, businessName);
    }
  }

  /**
   * Send deposit notification
   */
  async notifyDeposit(userId: string, amount: number, newBalance: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.create({
      userId,
      title: 'Deposit Successful! 💵',
      message: `₵${amount.toLocaleString()} has been added to your wallet. New balance: ₵${newBalance.toLocaleString()}`,
      type: 'SUCCESS',
      category: 'TRANSACTION',
      link: '/wallet',
    });

    if (user.phone) {
      await smsService.sendTransactionAlert(user.phone, 'DEPOSIT', amount, newBalance);
    }
  }

  /**
   * Send withdrawal notification
   */
  async notifyWithdrawal(userId: string, amount: number, newBalance: number): Promise<void> {
    await this.create({
      userId,
      title: 'Withdrawal Initiated',
      message: `Your withdrawal of ₵${amount.toLocaleString()} is being processed.`,
      type: 'INFO',
      category: 'TRANSACTION',
      link: '/wallet',
    });
  }

  /**
   * Send business approved notification
   */
  async notifyBusinessApproved(userId: string, businessName: string): Promise<void> {
    await this.create({
      userId,
      title: 'Business Approved! 🎉',
      message: `Great news! ${businessName} has been approved. You can now create investment opportunities.`,
      type: 'SUCCESS',
      category: 'BUSINESS',
      link: '/owner',
      sendEmail: true,
    });
  }

  /**
   * Send returns notification
   */
  async notifyReturns(userId: string, amount: number, businessName: string): Promise<void> {
    await this.create({
      userId,
      title: 'Investment Returns! 💰',
      message: `You've received ₵${amount.toLocaleString()} in returns from ${businessName}`,
      type: 'SUCCESS',
      category: 'INVESTMENT',
      link: '/investor',
      sendEmail: true,
      sendSMS: true,
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

