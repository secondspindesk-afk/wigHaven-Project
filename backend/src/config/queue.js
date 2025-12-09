import { createRequire } from 'module';
import logger from '../utils/logger.js';

// Import CommonJS pg-boss module using require
const require = createRequire(import.meta.url);
const PgBossModule = require('pg-boss');

// pg-boss exports PgBoss as a named export
const PgBoss = PgBossModule.PgBoss;

let boss;
let initializationPromise = null;

// Define all queue names used in the application
const QUEUE_NAMES = ['emails', 'webhooks'];

/**
 * Initialize PgBoss Queue System
 */
export const initializeQueue = async () => {
    // If already initialized, return instance
    if (boss) return boss;

    // If initialization is in progress, wait for it
    if (initializationPromise) {
        return initializationPromise;
    }

    // Start initialization
    initializationPromise = (async () => {
        try {
            logger.info('🐘 Initializing PgBoss Queue System...');

            // Create new instance with database connection string
            const newBoss = new PgBoss({
                connectionString: process.env.DATABASE_URL,
                // Optional: Configure retention, etc.
                archiveCompletedAfterSeconds: 3600 * 24 * 7, // Keep completed jobs for 7 days
                deleteAfterDays: 7, // Delete archived jobs after 7 days
                maxExpiration: 3600 * 4, // Max job duration 4 hours
            });

            // Error handling
            newBoss.on('error', (error) => {
                logger.error('PgBoss Error:', error);
            });

            // Start the queue system
            await newBoss.start();

            // Create all required queues
            for (const queueName of QUEUE_NAMES) {
                await newBoss.createQueue(queueName);
                logger.info(`✓ Created queue: ${queueName}`);
            }

            logger.info('✅ PgBoss Queue System Started');

            boss = newBoss;
            return boss;
        } catch (error) {
            logger.error('❌ Failed to initialize PgBoss:', error);
            initializationPromise = null; // Reset promise on failure so we can retry
            throw error;
        }
    })();

    return initializationPromise;
};

/**
 * Get PgBoss instance
 */
export const getQueue = () => {
    if (!boss) {
        throw new Error('Queue system not initialized. Call initializeQueue() first.');
    }
    return boss;
};

/**
 * Stop PgBoss
 */
export const stopQueue = async () => {
    if (boss) {
        logger.info('🛑 Stopping PgBoss...');
        await boss.stop();
        logger.info('✓ PgBoss Stopped');
        boss = null;
        initializationPromise = null;
    }
};
