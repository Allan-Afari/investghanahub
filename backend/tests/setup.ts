import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { expect } from '@jest/globals';

dotenv.config();

const prisma = new PrismaClient();

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
    }
  }
}

expect.extend({
  toBeValidUUID(received: unknown) {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidV4Regex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },
});

export async function cleanDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.profitTransfer.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.investment.deleteMany(),
    prisma.investmentOpportunity.deleteMany(),
    prisma.bankAccount.deleteMany(),
    prisma.business.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.kYC.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.fraudAlert.deleteMany(),
    prisma.oTPCode.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function createTestUser(overrides?: {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: Role;
}): Promise<{ id: string; email: string } & Record<string, any>> {
  const email = overrides?.email ?? `test_${Date.now()}@example.com`;
  const password = overrides?.password ?? 'password123';
  const firstName = overrides?.firstName ?? 'Test';
  const lastName = overrides?.lastName ?? 'User';
  const phone = overrides?.phone;
  const role = overrides?.role ?? Role.INVESTOR;

  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role,
    },
  });
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
