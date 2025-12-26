import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import logger from '../utils/logger.js';

// Required for Node.js environments when using WebSockets with Neon
neonConfig.webSocketConstructor = ws;

let prisma = null;
let heartbeatInterval = null;
let lastConnectionError = 0;
let currentProvider = 'unknown';

// Connection configuration
const DB_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30 * 1000,  // Ping every 30 seconds
  ERROR_LOG_DEBOUNCE_MS: 30 * 1000,  // Only log same error once per 30 seconds
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 500,
};

/**
 * Detect database provider from URL
 */
const detectProvider = (url) => {
  if (!url) return 'unknown';
  if (url.includes('xata.tech')) return 'xata';
  if (url.includes('neon.tech')) return 'neon';
  if (url.includes('supabase')) return 'supabase';
  return 'standard';
};

/**
 * Check if error is a connection reset error
 */
const isConnectionError = (error) => {
  const msg = error?.message?.toLowerCase() || '';
  const code = error?.code;

  return (
    msg.includes('connection reset') ||
    msg.includes('connection closed') ||
    (msg.includes('connection') && msg.includes('error')) ||
    msg.includes('closed') ||
    code === 'P1001' ||  // Unable to reach database
    code === 'P1008' ||  // Operations timed out
    code === 'P1017' ||  // Server closed connection
    code === 'P2024'     // Connection pool timeout
  );
};

/**
 * Log connection error with debouncing to prevent spam
 */
const logConnectionError = (message) => {
  const now = Date.now();
  if (now - lastConnectionError > DB_CONFIG.ERROR_LOG_DEBOUNCE_MS) {
    lastConnectionError = now;
    logger.warn(`[${currentProvider.toUpperCase()}] ${message}`);
  }
};

/**
 * Silent reconnection attempt
 * Returns true if successful, false otherwise
 */
const silentReconnect = async () => {
  try {
    if (prisma) {
      await prisma.$disconnect().catch(() => { });
      await prisma.$connect();
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Heartbeat function to keep connection alive
 * @returns {Promise<boolean>} - true if connection is healthy
 */
const heartbeat = async () => {
  if (!prisma) return false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    if (isConnectionError(error)) {
      const reconnected = await silentReconnect();
      if (!reconnected) {
        logConnectionError('Heartbeat reconnection failed, will retry on next heartbeat');
      }
      return reconnected;
    }
    return false;
  }
};

/**
 * Start automatic heartbeat to prevent idle disconnection
 */
const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(heartbeat, DB_CONFIG.HEARTBEAT_INTERVAL_MS);

  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }

  logger.info(`[${currentProvider.toUpperCase()}] Heartbeat started (every ${DB_CONFIG.HEARTBEAT_INTERVAL_MS / 1000}s)`);
};

/**
 * Stop heartbeat
 */
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

/**
 * Initialize Prisma Client with error handling and logging
 * Auto-detects provider (Xata, Neon, etc.) and uses appropriate adapter
 */
export const initializePrisma = async () => {
  try {
    if (prisma) {
      logger.info('Prisma client already initialized');
      return prisma;
    }

    const databaseUrl = process.env.DATABASE_URL;
    currentProvider = detectProvider(databaseUrl);

    const clientConfig = {
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'query', emit: 'event' },
      ],
      errorFormat: 'minimal',
      transactionOptions: {
        maxWait: 10000,  // 10s max wait to acquire connection
        timeout: 30000   // 30s max transaction duration
      },
    };

    // Use Neon adapter ONLY for Neon databases
    if (currentProvider === 'neon') {
      logger.info('[Prisma] Initializing with Neon Adapter (WebSocket Pooling)...');
      const pool = new Pool({ connectionString: databaseUrl });
      const adapter = new PrismaNeon(pool);
      clientConfig.adapter = adapter;
    } else {
      // For Xata, Supabase, or standard PostgreSQL - use native Prisma driver
      logger.info(`[Prisma] Initializing with standard driver for ${currentProvider.toUpperCase()}...`);
      // No adapter needed - Prisma uses native PostgreSQL driver
    }

    prisma = new PrismaClient(clientConfig);

    // Attach listeners
    prisma.$on('error', (e) => {
      if (isConnectionError(e)) {
        logConnectionError(e.message);
      } else {
        logger.error(`Prisma Error: ${e.message}`);
      }
    });

    prisma.$on('warn', (e) => {
      logger.warn(`Prisma Warning: ${e.message}`);
    });

    // Slow Query Detection (SLO: 200ms)
    prisma.$on('query', (e) => {
      if (e.duration >= 200) {
        logger.warn(`[SLOW QUERY] ${e.duration}ms - ${e.query}`);
      }
    });

    await prisma.$connect();
    logger.info(`✓ PostgreSQL connected successfully (${currentProvider.toUpperCase()})`);

    startHeartbeat();

    return prisma;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

/**
 * Get Prisma client instance
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
  stopHeartbeat();

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
 */
export const executeWithRetry = async (operation, maxRetries = DB_CONFIG.MAX_RETRIES) => {
  const client = getPrisma();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation(client);
    } catch (error) {
      if (isConnectionError(error) && attempt < maxRetries) {
        const delay = DB_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);

        if (attempt === 1) {
          logConnectionError(`Connection error, retrying (${attempt}/${maxRetries})...`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        await silentReconnect();
        continue;
      }

      throw error;
    }
  }
};

/**
 * Execute a database transaction with retry logic
 */
export const executeTransaction = async (callback, maxRetries = 2) => {
  const client = getPrisma();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.$transaction(callback);
    } catch (error) {
      if (isConnectionError(error) && attempt < maxRetries) {
        if (attempt === 1) {
          logConnectionError(`Transaction connection error, retrying...`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        await silentReconnect();
        continue;
      }

      logger.error('Transaction failed:', error);
      throw error;
    }
  }
};

/**
 * Health check for database connection
 */
export const healthCheck = async () => {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    const reconnected = await silentReconnect();
    return reconnected;
  }
};

/**
 * Manual keep-alive ping (for CRON jobs)
 */
export const keepAlive = async () => {
  return heartbeat();
};

/**
 * Get current database provider
 */
export const getProvider = () => currentProvider;

export default {
  initializePrisma,
  getPrisma,
  disconnectPrisma,
  executeTransaction,
  executeWithRetry,
  healthCheck,
  keepAlive,
  startHeartbeat,
  stopHeartbeat,
  getProvider,
};
