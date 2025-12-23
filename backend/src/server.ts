/**
 * InvestGhanaHub Backend Server
 * Main entry point for the Express server with proper error handling
 */

import app from './app';
import { prisma } from './config/database';
import { env } from './config/env';
import { initializeProfitScheduler } from './jobs/profitScheduler';
import http from 'http';

// Server port configuration
const PORT = env.PORT;
let server: http.Server | null = null;
let isShuttingDown = false;

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Create and start HTTP server
    console.log('🚀 Starting Express server...');
    server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 InvestGhanaHub Server running on port ${PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    });

    // Initialize profit distribution scheduler (non-blocking)
    initializeProfitScheduler()
      .then(() => {
        console.log('✅ Profit scheduler initialized');
      })
      .catch((error: unknown) => {
        console.error('❌ Profit scheduler initialization failed:', error);
      });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('❌ Server listen error:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} already in use`);
        process.exit(1);
      }
    });

    // Handle client errors gracefully
    server.on('clientError', (error: any, socket) => {
      if (error.code === 'ECONNRESET' || !socket.writable) {
        return;
      }
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('⏱️ Shutdown timeout - forcing exit');
    process.exit(1);
  }, 15000);

  try {
    if (server) {
      server.close(async () => {
        clearTimeout(shutdownTimeout);
        console.log('📴 HTTP server closed');
        await prisma.$disconnect();
        console.log('✅ Database disconnected');
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });

      // Stop accepting new connections
      server.closeAllConnections?.();
    } else {
      await prisma.$disconnect();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any) => {
  console.error('❌ Unhandled Rejection:');
  console.error(reason instanceof Error ? reason.message : String(reason));
  // Log but continue running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:');
  console.error(error.message);
  console.error(error.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start server
startServer().catch((error) => {
  console.error('❌ Fatal startup error:', error);
  process.exit(1);
});
