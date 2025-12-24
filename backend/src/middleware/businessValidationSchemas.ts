import Joi from 'joi';

// ===========================================
// BUSINESS VALIDATION SCHEMAS
// ===========================================

export const businessValidationSchema = Joi.object({
  name: Joi.string().min(3).max(100).trim().required(),
  description: Joi.string().min(10).max(1000).trim().required(),
  category: Joi.string().valid('crops', 'startup', 'operational').required(),
  region: Joi.string().min(2).max(50).trim().required(),
  city: Joi.string().min(2).max(50).trim().required(),
  address: Joi.string().min(10).max(200).trim().required(),
  phone: Joi.string().pattern(/^(\+233|0)[2-5][0-9]{8}$/).required(),
  email: Joi.string().email().required(),
  website: Joi.string().uri().optional(),
  expectedFunding: Joi.number().min(1000).max(10000000).required(),
  fundingType: Joi.string().valid('equity', 'debt', 'grant').required(),
  businessStage: Joi.string().valid('idea', 'startup', 'growth', 'mature').required(),
  employeeCount: Joi.number().min(1).max(10000).optional(),
  annualRevenue: Joi.number().min(0).optional(),
  profitMargin: Joi.number().min(0).max(100).optional(),
  marketSize: Joi.string().min(10).max(500).trim().optional(),
  competitiveAdvantage: Joi.string().min(10).max(500).trim().optional(),
  risks: Joi.string().min(10).max(500).trim().optional(),
  useOfFunds: Joi.string().min(10).max(500).trim().required()
});

export const opportunityValidationSchema = Joi.object({
  title: Joi.string().min(5).max(100).trim().required(),
  description: Joi.string().min(20).max(1000).trim().required(),
  // New (Phase 2) payload
  minInvestment: Joi.number().min(100).max(1000000).optional(),
  maxInvestment: Joi.number().min(100).max(10000000).optional(),
  targetAmount: Joi.number().min(1000).max(10000000).optional(),
  investmentModel: Joi.string().valid('EQUITY', 'DEBT', 'REVENUE_SHARE').optional(),
  equityPercentage: Joi.number().min(0.1).max(100).optional(),
  interestRate: Joi.number().min(0).max(1000).optional(),
  revenueSharePercentage: Joi.number().min(0.1).max(100).optional(),
  expectedReturn: Joi.number().min(0).max(1000).optional(),
  duration: Joi.number().min(1).max(240).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),

  // Legacy payload (kept for backwards compatibility)
  investmentAmount: Joi.number().min(1000).max(10000000).optional(),
  minimumInvestment: Joi.number().min(100).max(1000000).optional(),
  investmentPeriod: Joi.number().min(1).max(240).optional(),
  deadline: Joi.date().min('now').optional(),

  riskLevel: Joi.string().valid('low', 'medium', 'high').required(),
  documents: Joi.array().items(Joi.string().uri()).optional()
});
