import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTermsParams {
  type: 'INVESTOR' | 'BUSINESS_OWNER' | 'PLATFORM';
  version: string;
  content: string;
  effectiveDate: Date;
  isCurrent?: boolean;
}

export interface CreateDisclaimerParams {
  type: 'INVESTMENT_RISK' | 'TAX_IMPLICATIONS' | 'REGULATORY' | 'PLATFORM_LIMITATIONS';
  title: string;
  content: string;
  requiredAcceptance?: boolean;
  applicableRoles?: string[];
}

export interface UserAgreementParams {
  userId: string;
  termsId: string;
  disclaimerIds: string[];
  ipAddress: string;
  userAgent: string;
}

export class LegalComplianceService {
  /**
   * Create terms and conditions
   */
  async createTerms(params: CreateTermsParams, adminId: string) {
    try {
      // If this is the current version, mark all others as not current
      if (params.isCurrent) {
        await prisma.termsAndConditions.updateMany({
          where: { type: params.type },
          data: { isCurrent: false },
        });
      }

      const terms = await prisma.termsAndConditions.create({
        data: {
          type: params.type,
          version: params.version,
          content: params.content,
          effectiveDate: params.effectiveDate,
          isCurrent: params.isCurrent || false,
          createdBy: adminId,
        },
      });

      return {
        success: true,
        data: terms,
      };
    } catch (error) {
      console.error('Create terms error:', error);
      return {
        success: false,
        message: 'Failed to create terms',
      };
    }
  }

  /**
   * Create disclaimer
   */
  async createDisclaimer(params: CreateDisclaimerParams, adminId: string) {
    try {
      const disclaimer = await prisma.disclaimer.create({
        data: {
          type: params.type,
          title: params.title,
          content: params.content,
          requiredAcceptance: params.requiredAcceptance || false,
          applicableRoles: params.applicableRoles || [],
          createdBy: adminId,
        },
      });

      return {
        success: true,
        data: disclaimer,
      };
    } catch (error) {
      console.error('Create disclaimer error:', error);
      return {
        success: false,
        message: 'Failed to create disclaimer',
      };
    }
  }

  /**
   * Get current terms and disclaimers
   */
  async getCurrentTermsAndDisclaimers(userRole?: string) {
    try {
      const [terms, disclaimers] = await Promise.all([
        prisma.termsAndConditions.findMany({
          where: { isCurrent: true },
          orderBy: { type: 'asc' },
        }),
        prisma.disclaimer.findMany({
          where: {
            OR: [
              { applicableRoles: { isEmpty: true } },
              { applicableRoles: { has: userRole || 'ALL' } },
            ],
          },
          orderBy: { type: 'asc' },
        }),
      ]);

      return {
        success: true,
        data: {
          terms,
          disclaimers,
        },
      };
    } catch (error) {
      console.error('Get current terms error:', error);
      return {
        success: false,
        message: 'Failed to get terms and disclaimers',
      };
    }
  }

  /**
   * Record user agreement acceptance
   */
  async recordUserAgreement(params: UserAgreementParams) {
    try {
      // Check if user has already accepted current terms
      const existingAgreement = await prisma.userAgreement.findFirst({
        where: {
          userId: params.userId,
          terms: {
            isCurrent: true,
            type: { in: ['INVESTOR', 'BUSINESS_OWNER', 'PLATFORM'] },
          },
        },
      });

      if (existingAgreement) {
        return {
          success: true,
          message: 'Terms already accepted',
          data: existingAgreement,
        };
      }

      const agreement = await prisma.userAgreement.create({
        data: {
          userId: params.userId,
          termsId: params.termsId,
          disclaimerIds: params.disclaimerIds,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          acceptedAt: new Date(),
        },
      });

      return {
        success: true,
        data: agreement,
      };
    } catch (error) {
      console.error('Record user agreement error:', error);
      return {
        success: false,
        message: 'Failed to record agreement',
      };
    }
  }

  /**
   * Check if user has accepted current terms
   */
  async checkUserAgreement(userId: string, termsType: string) {
    try {
      const agreement = await prisma.userAgreement.findFirst({
        where: {
          userId,
          terms: {
            type: termsType,
            isCurrent: true,
          },
        },
        include: {
          terms: true,
          disclaimers: true,
        },
      });

      return {
        success: true,
        data: agreement,
        hasAccepted: !!agreement,
      };
    } catch (error) {
      console.error('Check user agreement error:', error);
      return {
        success: false,
        message: 'Failed to check user agreement',
      };
    }
  }

  /**
   * Get Ghana-specific compliance requirements
   */
  async getGhanaComplianceRequirements() {
    return {
      success: true,
      message: 'Compliance requirements retrieved successfully',
      data: {
        investorRequirements: {
          minAge: 18,
          kycRequired: true,
          accreditedInvestor: {
            definition: 'Individual with annual income > ₵60,000 or net worth > ₵1,000,000',
            verificationRequired: true,
          },
          nonAccreditedLimits: {
            annualInvestmentLimit: 35000, // ~$25,000 USD
            perInvestmentLimit: 5000, // ~$3,500 USD
          },
        },
        businessRequirements: {
          registrationRequired: true,
          taxComplianceRequired: true,
          businessBankAccountRequired: true,
          directorKycRequired: true,
          financialStatementsRequired: true,
        },
        platformCompliance: {
          secRegistration: 'Required for securities offerings',
          dataProtection: 'Data Protection Act 2012 compliance',
          antiMoneyLaundering: 'AML/KYC procedures required',
          transactionReporting: 'Large transactions must be reported',
        },
        riskDisclosures: [
          'Investment risks: Loss of capital, illiquidity, business failure',
          'Market risks: Economic conditions, regulatory changes, competition',
          'Platform risks: Technology failures, security breaches, platform bankruptcy',
          'Currency risks: Exchange rate fluctuations, inflation',
        ],
        taxImplications: [
          'Capital gains tax on investment profits',
          'Withholding tax on dividends and interest',
          'Tax reporting requirements for investors',
          'Business tax obligations for companies',
        ],
        legalFramework: {
          governingLaw: 'Ghanaian Companies Act 2019',
          regulatoryBody: 'Securities and Exchange Commission (SEC) Ghana',
          disputeResolution: 'Ghanaian courts and arbitration',
          investorProtection: 'SEC investor protection guidelines',
        },
      },
    };
  }

  /**
   * Generate investment risk disclosure
   */
  async generateRiskDisclosure(businessId: string, investmentAmount: number) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          opportunities: {
            where: { status: 'OPEN' },
            select: { targetAmount: true },
          },
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const totalRaised = business.opportunities?.reduce((sum: number, opp: any) => sum + (opp.targetAmount || 0), 0) || 0;
      const fundingProgress = (totalRaised / (business.targetAmount || 1)) * 100;
      const riskLevel = this.calculateRiskLevel(business);

      return {
        success: true,
        data: {
          businessName: business.name,
          investmentAmount,
          riskLevel,
          riskFactors: this.getRiskFactors(business, riskLevel),
          potentialReturns: this.getPotentialReturns(business),
          liquidityRisk: 'High - Investments are illiquid for 3-5 years',
          marketRisk: 'Medium - Subject to Ghanaian market conditions',
          regulatoryRisk: 'Low - Compliant with SEC Ghana requirements',
          diversificationRecommendation: this.getDiversificationAdvice(business, investmentAmount),
          worstCaseScenario: this.getWorstCaseScenario(business, investmentAmount),
          exitStrategy: this.getExitStrategy(business),
          disclaimer: 'This is not financial advice. Invest only what you can afford to lose.',
        },
      };
    } catch (error) {
      console.error('Generate risk disclosure error:', error);
      return {
        success: false,
        message: 'Failed to generate risk disclosure',
      };
    }
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(business: any): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Business stage risk
    if (business.stage === 'IDEA') riskScore += 3;
    else if (business.stage === 'STARTUP') riskScore += 2;
    else if (business.stage === 'GROWTH') riskScore += 1;

    // Industry risk
    const highRiskIndustries = ['CRYPTOCURRENCY', 'BIOTECH', 'REAL_ESTATE'];
    if (highRiskIndustries.includes(business.industry)) riskScore += 2;

    // Financial risk
    if (!business.hasFinancialStatements) riskScore += 2;
    if (!business.isVerified) riskScore += 2;

    if (riskScore <= 2) return 'LOW';
    if (riskScore <= 4) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get risk factors
   */
  private getRiskFactors(business: any, riskLevel: string): string[] {
    const factors = [];

    if (business.stage === 'IDEA') factors.push('Early-stage concept with no proven market');
    if (business.stage === 'STARTUP') factors.push('Limited operating history and revenue data');
    if (!business.isVerified) factors.push('Business not yet verified by platform');
    if (!business.hasFinancialStatements) factors.push('No audited financial statements available');
    if (riskLevel === 'HIGH') factors.push('High-risk industry category');

    return factors;
  }

  /**
   * Get potential returns
   */
  private getPotentialReturns(business: any): any {
    const baseReturns = {
      'TECH': { min: 15, max: 40, average: 25 },
      'AGRICULTURE': { min: 8, max: 20, average: 14 },
      'MANUFACTURING': { min: 10, max: 25, average: 18 },
      'SERVICES': { min: 12, max: 30, average: 20 },
      'RETAIL': { min: 8, max: 22, average: 15 },
    };

    return baseReturns[business.industry as keyof typeof baseReturns] || baseReturns['SERVICES'];
  }

  /**
   * Get diversification advice
   */
  private getDiversificationAdvice(business: any, investmentAmount: number): string {
    const portfolioPercentage = (investmentAmount / 100000) * 100; // Assuming ₵100k portfolio
    if (portfolioPercentage > 20) {
      return 'Consider diversifying - This investment represents >20% of a ₵100k portfolio';
    }
    return 'Investment within reasonable diversification limits';
  }

  /**
   * Get worst case scenario
   */
  private getWorstCaseScenario(business: any, investmentAmount: number): string {
    return `Potential loss of entire ₵${investmentAmount.toLocaleString()} investment if business fails`;
  }

  /**
   * Get exit strategy
   */
  private getExitStrategy(business: any): string {
    const strategies = {
      'TECH': 'Acquisition by larger company or IPO after 5-7 years',
      'AGRICULTURE': 'Buyout by agricultural conglomerate or steady dividend income',
      'MANUFACTURING': 'Strategic acquisition or management buyout after 4-6 years',
      'SERVICES': 'Buyout by competitor or private equity after 3-5 years',
    };

    return strategies[business.industry as keyof typeof strategies] || strategies['SERVICES'];
  }
}

// Export singleton instance
export const legalComplianceService = new LegalComplianceService();
