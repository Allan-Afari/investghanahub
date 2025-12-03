/**
 * InvestGhanaHub Backend Server
 * Main entry point for the Express server
 */

import dotenv from 'dotenv';
import app from './app';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Server port configuration
const PORT = process.env.PORT || 5000;

/**
 * Start the server and connect to database
 */
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 InvestGhanaHub Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();

