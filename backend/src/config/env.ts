/**
 * Environment Configuration for InvestGhanaHub
 * Centralized environment variable management with validation
 */

import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Encryption
  ENCRYPTION_KEY: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;

  // Paystack
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;

  // Cloudinary
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;

  // SMS (Hubtel/Twilio)
  HUBTEL_CLIENT_ID?: string;
  HUBTEL_CLIENT_SECRET?: string;
  HUBTEL_SENDER_ID?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;

  // Sentry
  SENTRY_DSN?: string;

  // Redis
  REDIS_URL?: string;

  // Profit Scheduler
  ENABLE_PROFIT_SCHEDULER: boolean;
  PROFIT_CHECK_INTERVAL_MS: number;
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function validateEnv(): EnvConfig {
  // Validate critical secrets
  const jwtSecret = getEnvVar('JWT_SECRET');
  if (jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('JWT_SECRET must be changed from default value');
  }

  const encryptionKey = getEnvVar('ENCRYPTION_KEY');
  if (encryptionKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
  }

  return {
    NODE_ENV: getEnvVar('NODE_ENV', false) || 'development',
    PORT: parseInt(getEnvVar('PORT', false) || '5000', 10),
    FRONTEND_URL: getEnvVar('FRONTEND_URL', false) || 'http://localhost:5173',
    DATABASE_URL: getEnvVar('DATABASE_URL'),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', false) || '24h',
    ENCRYPTION_KEY: encryptionKey,
    RATE_LIMIT_WINDOW_MS: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', false) || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', false) || '100', 10),
    SMTP_HOST: getEnvVar('SMTP_HOST', false),
    SMTP_PORT: parseInt(getEnvVar('SMTP_PORT', false) || '587', 10),
    SMTP_USER: getEnvVar('SMTP_USER', false),
    SMTP_PASS: getEnvVar('SMTP_PASS', false),
    RESEND_API_KEY: getEnvVar('RESEND_API_KEY', false),
    FROM_EMAIL: getEnvVar('FROM_EMAIL', false),
    PAYSTACK_SECRET_KEY: getEnvVar('PAYSTACK_SECRET_KEY', false) || undefined,
    PAYSTACK_PUBLIC_KEY: getEnvVar('PAYSTACK_PUBLIC_KEY', false) || undefined,
    CLOUDINARY_CLOUD_NAME: getEnvVar('CLOUDINARY_CLOUD_NAME', false),
    CLOUDINARY_API_KEY: getEnvVar('CLOUDINARY_API_KEY', false),
    CLOUDINARY_API_SECRET: getEnvVar('CLOUDINARY_API_SECRET', false),
    HUBTEL_CLIENT_ID: getEnvVar('HUBTEL_CLIENT_ID', false),
    HUBTEL_CLIENT_SECRET: getEnvVar('HUBTEL_CLIENT_SECRET', false),
    HUBTEL_SENDER_ID: getEnvVar('HUBTEL_SENDER_ID', false),
    TWILIO_ACCOUNT_SID: getEnvVar('TWILIO_ACCOUNT_SID', false),
    TWILIO_AUTH_TOKEN: getEnvVar('TWILIO_AUTH_TOKEN', false),
    TWILIO_PHONE_NUMBER: getEnvVar('TWILIO_PHONE_NUMBER', false),
    SENTRY_DSN: getEnvVar('SENTRY_DSN', false),
    REDIS_URL: getEnvVar('REDIS_URL', false),
    ENABLE_PROFIT_SCHEDULER: getEnvVar('ENABLE_PROFIT_SCHEDULER', false) === 'true',
    PROFIT_CHECK_INTERVAL_MS: parseInt(getEnvVar('PROFIT_CHECK_INTERVAL_MS', false) || '3600000', 10),
  };
}

export const env = validateEnv();

