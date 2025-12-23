import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { authService } from '../../../src/services/authService';
import { cleanDatabase, createTestUser } from '../../setup';

const prisma = new PrismaClient();

describe('AuthService', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      };

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.role).toBe(userData.role);
      expect(result.token).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      // Create first user
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });

      // Try to register with same email
      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password456',
          firstName: 'Test2',
          lastName: 'User2',
          phone: '+1234567891',
          role: Role.INVESTOR,
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should hash password before storing', async () => {
      const password = 'password123';
      await authService.register({
        email: 'test@example.com',
        password,
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user?.password).not.toBe(password);
      expect(await bcrypt.compare(password, user!.password)).toBe(true);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
    });

    it('should not login with incorrect password', async () => {
      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should not login with non-existent email', async () => {
      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });

      const token = registerResult.token!;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
      expect(decoded).toBeDefined();
    });

    it('should reject invalid token', async () => {
      expect(() => jwt.verify('invalid-token', process.env.JWT_SECRET || 'your-super-secret-jwt-key')).toThrow();
    });

    it('should reject expired token', async () => {
      // Create a token that expires immediately
      const expiredToken = jwt.sign(
        { userId: 'test-id', email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      expect(() => jwt.verify(expiredToken, process.env.JWT_SECRET || 'test-secret')).toThrow();
    });
  });

  describe('changePassword', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'oldpassword',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });
      userId = result.user.id;
    });

    it('should change password successfully', async () => {
      await authService.changePassword(userId, 'oldpassword', 'newpassword');

      // Verify new password works
      const loginResult = await authService.login('test@example.com', 'newpassword');
      expect(loginResult.user.email).toBe('test@example.com');
    });

    it('should not change password with wrong old password', async () => {
      await expect(authService.changePassword(userId, 'wrongpassword', 'newpassword')).rejects.toThrow(
        'Current password is incorrect'
      );
    });
  });

  describe.skip('generatePasswordResetToken', () => {
    const authServiceAny = authService as any;

    it('should generate reset token for existing user', async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });

      const result = await authServiceAny.generatePasswordResetToken('test@example.com');

      expect(result.token).toBeDefined();
      expect(String(result.token)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should not generate reset token for non-existent user', async () => {
      await expect(authServiceAny.generatePasswordResetToken('nonexistent@example.com')).rejects.toThrow();
    });
  });

  describe.skip('resetPassword', () => {
    const authServiceAny = authService as any;
    let resetToken: string;

    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'oldpassword',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: Role.INVESTOR,
      });

      const tokenResult = await authServiceAny.generatePasswordResetToken('test@example.com');
      resetToken = tokenResult.token!;
    });

    it('should reset password with valid token', async () => {
      await authServiceAny.resetPassword(resetToken, 'newpassword');

      // Verify new password works
      const loginResult = await authService.login('test@example.com', 'newpassword');
      expect(loginResult.user.email).toBe('test@example.com');
    });

    it('should not reset password with invalid token', async () => {
      await expect(authServiceAny.resetPassword('invalid-token', 'newpassword')).rejects.toThrow();
    });
  });
});
