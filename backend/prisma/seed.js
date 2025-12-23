"use strict";
/**
 * Database Seed Script for InvestGhanaHub
 * Creates test data for development and testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
// Encryption function (simplified for seed)
function simpleEncrypt(text) {
    return Buffer.from(text).toString('base64') + ':seed:encrypted';
}
async function main() {
    console.log('🌱 Starting database seed...\n');
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.fraudAlert.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.investment.deleteMany();
    await prisma.investmentOpportunity.deleteMany();
    await prisma.business.deleteMany();
    await prisma.kYC.deleteMany();
    await prisma.user.deleteMany();
    // Create Admin User
    console.log('👤 Creating admin user...');
    const adminPassword = await bcryptjs_1.default.hash('Admin@123', 12);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@investghanahub.com',
            password: adminPassword,
            firstName: 'System',
            lastName: 'Administrator',
            phone: '+233200000000',
            role: 'ADMIN',
            isActive: true
        }
    });
    // Create Investors
    console.log('👥 Creating investor users...');
    const investorPassword = await bcryptjs_1.default.hash('Investor@123', 12);
    const investor1 = await prisma.user.create({
        data: {
            email: 'kofi.mensah@email.com',
            password: investorPassword,
            firstName: 'Kofi',
            lastName: 'Mensah',
            phone: '+233240001111',
            role: 'INVESTOR',
            isActive: true
        }
    });
    const investor2 = await prisma.user.create({
        data: {
            email: 'ama.asante@email.com',
            password: investorPassword,
            firstName: 'Ama',
            lastName: 'Asante',
            phone: '+233240002222',
            role: 'INVESTOR',
            isActive: true
        }
    });
    const investor3 = await prisma.user.create({
        data: {
            email: 'kwame.boateng@email.com',
            password: investorPassword,
            firstName: 'Kwame',
            lastName: 'Boateng',
            phone: '+233240003333',
            role: 'INVESTOR',
            isActive: true
        }
    });
    // Create Business Owners
    console.log('🏢 Creating business owner users...');
    const ownerPassword = await bcryptjs_1.default.hash('Owner@123', 12);
    const owner1 = await prisma.user.create({
        data: {
            email: 'akua.owusu@email.com',
            password: ownerPassword,
            firstName: 'Akua',
            lastName: 'Owusu',
            phone: '+233540001111',
            role: 'BUSINESS_OWNER',
            isActive: true
        }
    });
    const owner2 = await prisma.user.create({
        data: {
            email: 'yaw.adomako@email.com',
            password: ownerPassword,
            firstName: 'Yaw',
            lastName: 'Adomako',
            phone: '+233540002222',
            role: 'BUSINESS_OWNER',
            isActive: true
        }
    });
    // Create KYC records
    console.log('📋 Creating KYC records...');
    // Approved KYC for investor1
    await prisma.kYC.create({
        data: {
            userId: investor1.id,
            ghanaCardNumber: simpleEncrypt('GHA-123456789-0'),
            dateOfBirth: new Date('1985-03-15'),
            address: '12 Independence Avenue',
            city: 'Accra',
            region: 'Greater Accra',
            occupation: 'Software Engineer',
            sourceOfFunds: 'Employment Income',
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    // Approved KYC for investor2
    await prisma.kYC.create({
        data: {
            userId: investor2.id,
            ghanaCardNumber: simpleEncrypt('GHA-234567890-1'),
            dateOfBirth: new Date('1990-07-22'),
            address: '45 Oxford Street',
            city: 'Kumasi',
            region: 'Ashanti',
            occupation: 'Business Analyst',
            sourceOfFunds: 'Business Revenue',
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    // Pending KYC for investor3
    await prisma.kYC.create({
        data: {
            userId: investor3.id,
            ghanaCardNumber: simpleEncrypt('GHA-345678901-2'),
            dateOfBirth: new Date('1988-11-30'),
            address: '78 Liberation Road',
            city: 'Takoradi',
            region: 'Western',
            occupation: 'Medical Doctor',
            sourceOfFunds: 'Salary',
            status: 'PENDING'
        }
    });
    // Approved KYC for business owners
    await prisma.kYC.create({
        data: {
            userId: owner1.id,
            ghanaCardNumber: simpleEncrypt('GHA-456789012-3'),
            dateOfBirth: new Date('1982-05-10'),
            address: '23 Cantonments Road',
            city: 'Accra',
            region: 'Greater Accra',
            occupation: 'Entrepreneur',
            sourceOfFunds: 'Business Revenue',
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    await prisma.kYC.create({
        data: {
            userId: owner2.id,
            ghanaCardNumber: simpleEncrypt('GHA-567890123-4'),
            dateOfBirth: new Date('1979-09-18'),
            address: '56 Labone Crescent',
            city: 'Accra',
            region: 'Greater Accra',
            occupation: 'Agricultural Expert',
            sourceOfFunds: 'Farming Business',
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    // Create Businesses
    console.log('🏭 Creating businesses...');
    const business1 = await prisma.business.create({
        data: {
            ownerId: owner1.id,
            name: 'GhanaGrow Maize Farm',
            description: 'A 50-acre commercial maize farm in the Eastern Region. We use modern farming techniques and irrigation systems to produce high-quality maize for both local consumption and export. Our farm has been operational for 5 years with consistent yields.',
            category: 'crops',
            location: 'Koforidua, Eastern Region',
            region: 'Eastern',
            registrationNumber: 'BN-2019-0012345',
            targetAmount: 150000,
            currentAmount: 45000,
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    const business2 = await prisma.business.create({
        data: {
            ownerId: owner1.id,
            name: 'TechStart Ghana',
            description: 'An innovative fintech startup developing mobile payment solutions for rural Ghana. Our app enables farmers and small traders to send and receive payments without needing a bank account. Currently serving 10,000+ users.',
            category: 'startup',
            location: 'East Legon, Accra',
            region: 'Greater Accra',
            registrationNumber: 'BN-2021-0067890',
            targetAmount: 500000,
            currentAmount: 120000,
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    const business3 = await prisma.business.create({
        data: {
            ownerId: owner2.id,
            name: 'Golden Cocoa Processing Ltd',
            description: 'An established cocoa processing facility in the Western Region. We purchase cocoa beans from local farmers and process them into cocoa butter, powder, and liquor for export. Operating since 2015 with strong international partnerships.',
            category: 'operational',
            location: 'Takoradi Industrial Area',
            region: 'Western',
            registrationNumber: 'BN-2015-0098765',
            targetAmount: 800000,
            currentAmount: 350000,
            status: 'APPROVED',
            reviewedBy: admin.id,
            reviewedAt: new Date()
        }
    });
    const business4 = await prisma.business.create({
        data: {
            ownerId: owner2.id,
            name: 'AgroTech Solutions',
            description: 'A modern greenhouse vegetable farm using hydroponic technology. We produce premium tomatoes, peppers, and lettuce year-round for hotels and supermarkets in Accra.',
            category: 'crops',
            location: 'Tema Free Zone',
            region: 'Greater Accra',
            targetAmount: 250000,
            status: 'PENDING'
        }
    });
    // Create Investment Opportunities
    console.log('💰 Creating investment opportunities...');
    const opportunity1 = await prisma.investmentOpportunity.create({
        data: {
            businessId: business1.id,
            title: 'Maize Planting Season 2024',
            description: 'Invest in our upcoming maize planting season. Funds will be used for seeds, fertilizers, and labor. Expected harvest in 4 months with strong market demand.',
            minInvestment: 500,
            maxInvestment: 20000,
            expectedReturn: 18,
            duration: 6,
            riskLevel: 'medium',
            targetAmount: 75000,
            currentAmount: 25000,
            status: 'OPEN',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
    });
    const opportunity2 = await prisma.investmentOpportunity.create({
        data: {
            businessId: business2.id,
            title: 'Series A Expansion Round',
            description: 'Join our Series A funding round to expand TechStart Ghana to Northern Ghana. Funds will support technology development and agent network expansion.',
            minInvestment: 2000,
            maxInvestment: 100000,
            expectedReturn: 35,
            duration: 24,
            riskLevel: 'high',
            targetAmount: 300000,
            currentAmount: 80000,
            status: 'OPEN',
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
        }
    });
    const opportunity3 = await prisma.investmentOpportunity.create({
        data: {
            businessId: business3.id,
            title: 'Cocoa Processing Capacity Expansion',
            description: 'Invest in new processing equipment to double our production capacity. Strong export contracts already secured with European buyers.',
            minInvestment: 5000,
            maxInvestment: 50000,
            expectedReturn: 22,
            duration: 18,
            riskLevel: 'low',
            targetAmount: 250000,
            currentAmount: 150000,
            status: 'OPEN',
            startDate: new Date(),
            endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 days from now
        }
    });
    const opportunity4 = await prisma.investmentOpportunity.create({
        data: {
            businessId: business1.id,
            title: 'Irrigation System Upgrade',
            description: 'Fund the installation of modern drip irrigation system to improve water efficiency and crop yields.',
            minInvestment: 1000,
            maxInvestment: 30000,
            expectedReturn: 15,
            duration: 12,
            riskLevel: 'low',
            targetAmount: 50000,
            currentAmount: 20000,
            status: 'OPEN',
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
        }
    });
    // Create Investments
    console.log('📈 Creating sample investments...');
    // Investor 1 investments
    const investment1 = await prisma.investment.create({
        data: {
            investorId: investor1.id,
            opportunityId: opportunity1.id,
            amount: 5000,
            expectedReturn: 5900,
            status: 'ACTIVE',
            maturityDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        }
    });
    const investment2 = await prisma.investment.create({
        data: {
            investorId: investor1.id,
            opportunityId: opportunity3.id,
            amount: 10000,
            expectedReturn: 12200,
            status: 'ACTIVE',
            maturityDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000)
        }
    });
    // Investor 2 investments
    const investment3 = await prisma.investment.create({
        data: {
            investorId: investor2.id,
            opportunityId: opportunity2.id,
            amount: 15000,
            expectedReturn: 20250,
            status: 'ACTIVE',
            maturityDate: new Date(Date.now() + 720 * 24 * 60 * 60 * 1000)
        }
    });
    const investment4 = await prisma.investment.create({
        data: {
            investorId: investor2.id,
            opportunityId: opportunity4.id,
            amount: 8000,
            expectedReturn: 9200,
            status: 'ACTIVE',
            maturityDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000)
        }
    });
    // Create Transactions
    console.log('💳 Creating transactions...');
    await prisma.transaction.createMany({
        data: [
            {
                userId: investor1.id,
                investmentId: investment1.id,
                type: 'INVESTMENT',
                amount: 5000,
                reference: 'INV-SEED-001',
                description: 'Investment in Maize Planting Season 2024'
            },
            {
                userId: investor1.id,
                investmentId: investment2.id,
                type: 'INVESTMENT',
                amount: 10000,
                reference: 'INV-SEED-002',
                description: 'Investment in Cocoa Processing Capacity Expansion'
            },
            {
                userId: investor2.id,
                investmentId: investment3.id,
                type: 'INVESTMENT',
                amount: 15000,
                reference: 'INV-SEED-003',
                description: 'Investment in TechStart Ghana Series A'
            },
            {
                userId: investor2.id,
                investmentId: investment4.id,
                type: 'INVESTMENT',
                amount: 8000,
                reference: 'INV-SEED-004',
                description: 'Investment in Irrigation System Upgrade'
            }
        ]
    });
    // Create Audit Logs
    console.log('📝 Creating audit logs...');
    await prisma.auditLog.createMany({
        data: [
            {
                userId: admin.id,
                action: 'SYSTEM_SEED',
                entity: 'System',
                details: 'Database seeded with test data'
            },
            {
                userId: investor1.id,
                action: 'REGISTER',
                entity: 'User',
                entityId: investor1.id
            },
            {
                userId: investor1.id,
                action: 'KYC_SUBMIT',
                entity: 'KYC'
            },
            {
                userId: investor1.id,
                action: 'KYC_APPROVED',
                entity: 'KYC',
                adminId: admin.id
            },
            {
                userId: investor1.id,
                action: 'INVESTMENT_MADE',
                entity: 'Investment',
                entityId: investment1.id,
                details: JSON.stringify({ amount: 5000, opportunityId: opportunity1.id })
            }
        ]
    });
    // Create Sample Fraud Alert
    console.log('🚨 Creating sample fraud alert...');
    await prisma.fraudAlert.create({
        data: {
            userId: investor2.id,
            alertType: 'HIGH_AMOUNT',
            description: '[MEDIUM RISK] Investment of 15000 GHS flagged. Issues: High investment amount: 15000 GHS.',
            riskScore: 45,
            status: 'PENDING'
        }
    });
    console.log('\n✅ Database seed completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('━'.repeat(50));
    console.log('Admin:');
    console.log('  Email: admin@investghanahub.com');
    console.log('  Password: Admin@123');
    console.log('\nInvestors:');
    console.log('  Email: kofi.mensah@email.com');
    console.log('  Password: Investor@123');
    console.log('  KYC: APPROVED');
    console.log('\n  Email: ama.asante@email.com');
    console.log('  Password: Investor@123');
    console.log('  KYC: APPROVED');
    console.log('\n  Email: kwame.boateng@email.com');
    console.log('  Password: Investor@123');
    console.log('  KYC: PENDING');
    console.log('\nBusiness Owners:');
    console.log('  Email: akua.owusu@email.com');
    console.log('  Password: Owner@123');
    console.log('\n  Email: yaw.adomako@email.com');
    console.log('  Password: Owner@123');
    console.log('━'.repeat(50));
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map