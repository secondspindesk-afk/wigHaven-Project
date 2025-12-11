/**
 * Database Keep-Alive Job
 * Prevents Neon serverless from closing idle connections
 * Runs every 4 minutes to keep the connection pool warm
 */
import cron from 'node-cron';
import { keepAlive } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Start the database keep-alive job
 * Runs every 4 minutes to prevent Neon from closing idle connections
 * Neon closes connections after ~5 minutes of inactivity
 */
export const startDatabaseKeepAliveJob = () => {
    // Run every 4 minutes (before Neon's 5-minute timeout, reduces overhead by 50%)
    cron.schedule('*/4 * * * *', async () => {
        const startTime = Date.now();

        try {
            const success = await keepAlive();
            const duration = Date.now() - startTime;

            if (success) {
                // Only log occasionally to avoid log spam
                if (Math.random() < 0.1) { // Log ~10% of pings
                    logger.debug(`[CRON] db_keep_alive - Success | Duration: ${duration}ms`);
                }
            } else {
                logger.warn(`[CRON] db_keep_alive - Failed to maintain connection | Duration: ${duration}ms`);
            }
        } catch (error) {
            logger.error(`[CRON] db_keep_alive - Error: ${error.message}`);
        }
    });
};

export default { startDatabaseKeepAliveJob };
