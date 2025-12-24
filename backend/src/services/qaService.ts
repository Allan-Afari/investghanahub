import { PrismaClient } from '@prisma/client';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

export interface CreateQuestionParams {
  businessId: string;
  userId: string;
  question: string;
  isAnonymous?: boolean;
}

export interface CreateAnswerParams {
  questionId: string;
  userId: string;
  answer: string;
  attachments?: string[];
}

export interface CreateProgressUpdateParams {
  businessId: string;
  title: string;
  content: string;
  updateType: 'MILESTONE' | 'FINANCIAL' | 'OPERATIONAL' | 'GENERAL';
  attachments?: string[];
}

export interface QuestionFilters {
  businessId?: string;
  userId?: string;
  isAnswered?: boolean;
  page?: number;
  limit?: number;
}

export interface ProgressUpdateFilters {
  businessId?: string;
  updateType?: string;
  page?: number;
  limit?: number;
}

export class QAService {
  /**
   * Create a question for a business
   */
  async createQuestion(params: CreateQuestionParams): Promise<any> {
    try {
      // Verify business exists
      const business = await prisma.business.findUnique({
        where: { id: params.businessId },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!business) {
        throw new Error('Business not found');
      }

      // Create question
      const question = await prisma.question.create({
        data: {
          businessId: params.businessId,
          userId: params.userId,
          question: params.question,
          isAnonymous: params.isAnonymous || false,
          status: 'PENDING',
          createdAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              verificationStatus: true,
              profileImage: true
            }
          },
          business: {
            select: {
              id: true,
              name: true,
              ownerId: true
            }
          }
        }
      });

      // Notify business owner about new question
      await notificationService.create({
        userId: business.ownerId,
        title: 'New Question Posted',
        message: `A new question has been posted about your business "${business.name}"`,
        type: 'INFO',
        category: 'BUSINESS',
        sendEmail: true
      });

      return {
        success: true,
        data: question
      };
    } catch (error) {
      console.error('Create question error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create question'
      };
    }
  }

  /**
   * Answer a question
   */
  async createAnswer(params: CreateAnswerParams): Promise<any> {
    try {
      // Verify question exists and user can answer
      const question = await prisma.question.findUnique({
        where: { id: params.questionId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              ownerId: true
            }
          },
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

      if (!question) {
        throw new Error('Question not found');
      }

      // Check if user is business owner or admin
      if (question.business.ownerId !== params.userId) {
        throw new Error('Only business owners can answer questions');
      }

      // Create answer
      const answer = await prisma.answer.create({
        data: {
          questionId: params.questionId,
          userId: params.userId,
          answer: params.answer,
          attachments: params.attachments || [],
          createdAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              verificationStatus: true,
              profileImage: true
            }
          },
          question: {
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
          }
        }
      });

      // Update question status
      await prisma.question.update({
        where: { id: params.questionId },
        data: { 
          status: 'ANSWERED',
          answeredAt: new Date()
        }
      });

      // Notify question asker about answer
      await notificationService.create({
        userId: question.userId,
        title: 'Question Answered',
        message: `Your question about "${question.business.name}" has been answered`,
        type: 'INFO',
        category: 'BUSINESS',
        sendEmail: true
      });

      return {
        success: true,
        data: answer
      };
    } catch (error) {
      console.error('Create answer error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create answer'
      };
    }
  }

  /**
   * Get questions with filters
   */
  async getQuestions(filters: QuestionFilters): Promise<any> {
    try {
      const { businessId, userId, isAnswered, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = {};
      if (businessId) whereClause.businessId = businessId;
      if (userId) whereClause.userId = userId;
      if (isAnswered !== undefined) whereClause.status = isAnswered ? 'ANSWERED' : 'PENDING';

      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                verificationStatus: true,
                profileImage: true
              }
            },
            business: {
              select: {
                id: true,
                name: true,
                category: true
              }
            },
            answers: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    verificationStatus: true,
                    profileImage: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            _count: {
              select: { answers: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.question.count({ where: whereClause })
      ]);

      return {
        success: true,
        data: questions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get questions error:', error);
      return {
        success: false,
        message: 'Failed to retrieve questions'
      };
    }
  }

  /**
   * Get question by ID with answers
   */
  async getQuestionById(questionId: string): Promise<any> {
    try {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              verificationStatus: true,
              profileImage: true
            }
          },
          business: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              ownerId: true
            }
          },
          answers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  verificationStatus: true,
                  profileImage: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!question) {
        throw new Error('Question not found');
      }

      return {
        success: true,
        data: question
      };
    } catch (error) {
      console.error('Get question error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve question'
      };
    }
  }

  /**
   * Create progress update for business
   */
  async createProgressUpdate(params: CreateProgressUpdateParams, userId: string): Promise<any> {
    try {
      // Verify user owns the business
      const business = await prisma.business.findUnique({
        where: { id: params.businessId }
      });

      if (!business) {
        throw new Error('Business not found');
      }

      if (business.ownerId !== userId) {
        throw new Error('Only business owners can create progress updates');
      }

      // Create progress update
      const update = await prisma.progressUpdate.create({
        data: {
          businessId: params.businessId,
          title: params.title,
          content: params.content,
          type: params.updateType,
          attachments: params.attachments || [],
          postedBy: userId,
          createdAt: new Date()
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      });

      // Get all investors in this business to notify
      const investments = await prisma.investment.findMany({
        where: { 
          opportunity: {
            businessId: params.businessId
          }
        },
        select: { investorId: true }
      });

      // Notify all investors
      for (const investment of investments) {
        await notificationService.create({
          userId: investment.investorId,
          title: 'Business Progress Update',
          message: `${update.business?.name || 'A business'} has posted a new update: ${params.title}`,
          type: 'INFO',
          category: 'BUSINESS',
          sendEmail: true
        });
      }

      return {
        success: true,
        data: update
      };
    } catch (error) {
      console.error('Create progress update error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create progress update'
      };
    }
  }

  /**
   * Get progress updates with filters
   */
  async getProgressUpdates(filters: ProgressUpdateFilters): Promise<any> {
    try {
      const { businessId, updateType, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const whereClause: any = {};
      if (businessId) whereClause.businessId = businessId;
      if (updateType) whereClause.updateType = updateType;

      const [updates, total] = await Promise.all([
        prisma.progressUpdate.findMany({
          where: whereClause,
          include: {
            business: {
              select: {
                id: true,
                name: true,
                category: true,
                ownerId: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.progressUpdate.count({ where: whereClause })
      ]);

      return {
        success: true,
        data: updates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get progress updates error:', error);
      return {
        success: false,
        message: 'Failed to retrieve progress updates'
      };
    }
  }

  /**
   * Get Q&A statistics for a business
   */
  async getQAStats(businessId: string): Promise<any> {
    try {
      const [totalQuestions, answeredQuestions, pendingQuestions] = await Promise.all([
        prisma.question.count({ where: { businessId } }),
        prisma.question.count({ where: { businessId, status: 'ANSWERED' } }),
        prisma.question.count({ where: { businessId, status: 'PENDING' } })
      ]);

      const recentQuestions = await prisma.question.findMany({
        where: { businessId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return {
        success: true,
        data: {
          totalQuestions,
          answeredQuestions,
          pendingQuestions,
          answerRate: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
          recentQuestions
        }
      };
    } catch (error) {
      console.error('Get Q&A stats error:', error);
      return {
        success: false,
        message: 'Failed to retrieve Q&A statistics'
      };
    }
  }

  /**
   * Delete question (by question author or business owner)
   */
  async deleteQuestion(questionId: string, userId: string): Promise<any> {
    try {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          business: {
            select: { ownerId: true }
          }
        }
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check if user can delete (question author or business owner)
      if (question.userId !== userId && question.business.ownerId !== userId) {
        throw new Error('Not authorized to delete this question');
      }

      await prisma.question.delete({
        where: { id: questionId }
      });

      return {
        success: true,
        message: 'Question deleted successfully'
      };
    } catch (error) {
      console.error('Delete question error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete question'
      };
    }
  }
}

// Export singleton instance
export const qaService = new QAService();
