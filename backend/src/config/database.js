import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

let prisma = null;

// Neon serverless connection configuration
// Neon closes idle connections after ~5 minutes to save resources
// These settings ensure robust reconnection handling
const NEON_CONFIG = {
  // Connection pool settings optimized for Neon serverless
  pool: {
    min: 1,        // Keep at least 1 connection
    max: 10,       // Maximum connections (Neon free tier allows 20)
  },
  // Connection timeout settings
  connect_timeout: 10,   // 10 seconds to establish connection
  idle_timeout: 180,     // Close idle connections after 3 minutes (before Neon's 5 min)
};

/**
 * Initialize Prisma Client with error handling and logging
 * Implements singleton pattern to prevent multiple instances
 * Optimized for Neon serverless database with connection resiliency
 */
export const initializePrisma = async () => {
  try {
    if (prisma) {
      logger.info('Prisma client already initialized');
      return prisma;
    }

    prisma = new PrismaClient({
      log: [
        // Disable query logging - it adds significant overhead (100-500ms per query)
        // { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'minimal',
      // Performance optimizations
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Log database errors
    prisma.$on('error', (e) => {
      logger.error(`Prisma Error: ${e.message}`);
    });

    // Log warnings
    prisma.$on('warn', (e) => {
      logger.warn(`Prisma Warning: ${e.message}`);
    });

    // Test database connection
    await prisma.$connect();
    logger.info('✓ PostgreSQL connected successfully');

    return prisma;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

/**
 * Get Prisma client instance
 * Must call initializePrisma() first
 */
export const getPrisma = () => {
  if (!prisma) {
    throw new Error('Prisma client not initialized. Call initializePrisma() first.');
  }
  return prisma;
};

/**
 * Disconnect Prisma client gracefully
 */
export const disconnectPrisma = async () => {
  if (prisma) {
    try {
      await prisma.$disconnect();
      logger.info('✓ PostgreSQL disconnected successfully');
      prisma = null;
    } catch (error) {
      logger.error('Error disconnecting from PostgreSQL:', error);
      throw error;
    }
  }
};

/**
 * Execute a database query with automatic retry for connection errors
 * Handles Neon serverless connection drops gracefully
 * @param {Function} operation - Async function that performs the database operation
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise} - Query result
 */
export const executeWithRetry = async (operation, maxRetries = 3) => {
  const client = getPrisma();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(client);
    } catch (error) {
      const isConnectionError =
        error.message?.includes('Connection') ||
        error.message?.includes('Closed') ||
        error.message?.includes('connection') ||
        error.code === 'P1001' || // Unable to reach database
        error.code === 'P1008' || // Operations timed out
        error.code === 'P1017' || // Server closed connection
        error.code === 'P2024';   // Connection pool timeout

      if (isConnectionError && attempt < maxRetries) {
        logger.warn(`Database connection error (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying...`);

        // Exponential backoff: 500ms, 1s, 2s...
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));

        // Try to reconnect
        try {
          await client.$disconnect();
          await client.$connect();
          logger.info('Database reconnected successfully');
        } catch (reconnectError) {
          logger.warn(`Reconnection attempt failed: ${reconnectError.message}`);
        }

        continue;
      }

      // Not a connection error or max retries reached
      throw error;
    }
  }
};

/**
 * Execute a database transaction with retry logic
 * @param {Function} callback - Transaction callback function
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 * @returns {Promise} - Transaction result
 */
export const executeTransaction = async (callback, maxRetries = 2) => {
  const client = getPrisma();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.$transaction(callback);
    } catch (error) {
      const isConnectionError =
        error.message?.includes('Connection') ||
        error.message?.includes('Closed') ||
        error.message?.includes('connection') ||
        error.code === 'P1001' ||
        error.code === 'P1008' ||
        error.code === 'P1017' ||
        error.code === 'P2024';

      if (isConnectionError && attempt < maxRetries) {
        logger.warn(`Transaction failed due to connection error (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));

        // Try to reconnect
        try {
          await client.$disconnect();
          await client.$connect();
        } catch (reconnectError) {
          logger.warn(`Reconnection failed: ${reconnectError.message}`);
        }

        continue;
      }

      logger.error('Transaction failed:', error);
      throw error;
    }
  }
};

/**
 * Health check for database connection
 * Returns true if connection is healthy, false otherwise
 */
export const healthCheck = async () => {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn(`Database health check failed: ${error.message}`);
    return false;
  }
};

/**
 * Periodic connection keep-alive to prevent Neon from closing idle connections
 * Call this from a cron job every 2-3 minutes
 */
export const keepAlive = async () => {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn(`Keep-alive ping failed: ${error.message}`);

    // Try to reconnect
    try {
      await client.$disconnect();
      await client.$connect();
      logger.info('Connection restored after keep-alive failure');
      return true;
    } catch (reconnectError) {
      logger.error(`Failed to restore connection: ${reconnectError.message}`);
      return false;
    }
  }
};

export default {
  initializePrisma,
  getPrisma,
  disconnectPrisma,
  executeTransaction,
  executeWithRetry,
  healthCheck,
  keepAlive
};
