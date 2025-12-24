import { PrismaClient } from '@prisma/client';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

export interface SendMessageParams {
  senderId: string;
  receiverId: string;
  businessId?: string;
  subject?: string;
  content: string;
  messageType?: 'TEXT' | 'DOCUMENT' | 'IMAGE';
  attachments?: string[];
}

export interface MessageFilters {
  userId: string;
  messageType?: 'SENT' | 'RECEIVED';
  businessId?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export class MessagingService {
  /**
   * Send a message
   */
  async sendMessage(params: SendMessageParams): Promise<any> {
    try {
      // Verify receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: params.receiverId }
      });

      if (!receiver) {
        throw new Error('Receiver not found');
      }

      // Check if users can message each other (basic validation)
      if (params.senderId === params.receiverId) {
        throw new Error('Cannot send message to yourself');
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          senderId: params.senderId,
          receiverId: params.receiverId,
          businessId: params.businessId,
          subject: params.subject,
          content: params.content,
          messageType: params.messageType || 'TEXT',
          attachmentUrl: params.attachments?.[0] || null,
          isRead: false,
          createdAt: new Date()
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              verificationStatus: true
            }
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          business: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Send notification to receiver
      await notificationService.create({
        userId: params.receiverId,
        title: 'New Message',
        message: `You have a new message from ${message.sender.firstName} ${message.sender.lastName}`,
        type: 'INFO',
        category: 'MESSAGE',
        sendEmail: true
      });

      return {
        success: true,
        data: message
      };
    } catch (error) {
      console.error('Send message error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  /**
   * Get user's messages with filters
   */
  async getMessages(filters: MessageFilters): Promise<any> {
    try {
      const { userId, messageType, businessId, isRead, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      let whereClause: any = {};
      
      if (messageType === 'SENT') {
        whereClause.senderId = userId;
      } else if (messageType === 'RECEIVED') {
        whereClause.receiverId = userId;
      } else {
        whereClause.OR = [
          { senderId: userId },
          { receiverId: userId }
        ];
      }

      if (businessId) {
        whereClause.businessId = businessId;
      }

      if (isRead !== undefined) {
        whereClause.isRead = isRead;
      }

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: whereClause,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                verificationStatus: true,
                profileImage: true
              }
            },
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true
              }
            },
            business: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.message.count({ where: whereClause })
      ]);

      return {
        success: true,
        data: messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get messages error:', error);
      return {
        success: false,
        message: 'Failed to retrieve messages'
      };
    }
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string, userId: string): Promise<any> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              verificationStatus: true,
              profileImage: true
            }
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true
            }
          },
          business: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true
            }
          }
        }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Mark as read if user is receiver
      if (message.receiverId === userId && !message.isRead) {
        await prisma.message.update({
          where: { id: messageId },
          data: { isRead: true, readAt: new Date() }
        });
        message.isRead = true;
        message.readAt = new Date();
      }

      return {
        success: true,
        data: message
      };
    } catch (error) {
      console.error('Get message error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve message'
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[], userId: string): Promise<any> {
    try {
      // Verify user is receiver for all messages
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          receiverId: userId
        }
      });

      if (messages.length === 0) {
        throw new Error('No valid messages found');
      }

      // Update messages
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return {
        success: true,
        message: `${messages.length} messages marked as read`
      };
    } catch (error) {
      console.error('Mark messages as read error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark messages as read'
      };
    }
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<any> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Soft delete by marking as deleted
      await prisma.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId
        }
      });

      return {
        success: true,
        message: 'Message deleted successfully'
      };
    } catch (error) {
      console.error('Delete message error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete message'
      };
    }
  }

  /**
   * Get conversation between two users
   */
  async getConversation(userId1: string, userId2: string, page: number = 1, limit: number = 50): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: {
            OR: [
              { senderId: userId1, receiverId: userId2 },
              { senderId: userId2, receiverId: userId1 }
            ],
            deletedAt: null
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                verificationStatus: true
              }
            },
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true
              }
            },
            business: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.message.count({
          where: {
            OR: [
              { senderId: userId1, receiverId: userId2 },
              { senderId: userId2, receiverId: userId1 }
            ],
            deletedAt: null
          }
        })
      ]);

      return {
        success: true,
        data: messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get conversation error:', error);
      return {
        success: false,
        message: 'Failed to retrieve conversation'
      };
    }
  }

  /**
   * Get user's message statistics
   */
  async getMessageStats(userId: string): Promise<any> {
    try {
      const [sentCount, receivedCount, unreadCount] = await Promise.all([
        prisma.message.count({
          where: {
            senderId: userId,
            deletedAt: null
          }
        }),
        prisma.message.count({
          where: {
            receiverId: userId,
            deletedAt: null
          }
        }),
        prisma.message.count({
          where: {
            receiverId: userId,
            isRead: false,
            deletedAt: null
          }
        })
      ]);

      // Get recent conversations
      const recentConversations = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ],
          deletedAt: null
        },
        select: {
          senderId: true,
          receiverId: true,
          createdAt: true,
          sender: {
            select: {
              firstName: true,
              lastName: true,
              profileImage: true
            }
          },
          receiver: {
            select: {
              firstName: true,
              lastName: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Group by conversation partner
      const conversations = new Map();
      recentConversations.forEach(msg => {
        const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        const partner = msg.senderId === userId ? msg.receiver : msg.sender;
        
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            partnerId,
            partner,
            lastMessage: msg.createdAt,
            unreadCount: 0
          });
        }
      });

      return {
        success: true,
        data: {
          sentCount,
          receivedCount,
          unreadCount,
          totalConversations: conversations.size,
          recentConversations: Array.from(conversations.values())
        }
      };
    } catch (error) {
      console.error('Get message stats error:', error);
      return {
        success: false,
        message: 'Failed to retrieve message statistics'
      };
    }
  }
}

// Export singleton instance
export const messagingService = new MessagingService();
