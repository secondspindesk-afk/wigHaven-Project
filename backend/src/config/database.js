import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

let prisma = null;

/**
 * Initialize Prisma Client with error handling and logging
 * Implements singleton pattern to prevent multiple instances
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
 * Execute a database transaction
 * @param {Function} callback - Transaction callback function
 * @returns {Promise} - Transaction result
 */
export const executeTransaction = async (callback) => {
  const client = getPrisma();

  try {
    return await client.$transaction(callback);
  } catch (error) {
    logger.error('Transaction failed:', error);
    throw error;
  }
};

export default { initializePrisma, getPrisma, disconnectPrisma, executeTransaction };
