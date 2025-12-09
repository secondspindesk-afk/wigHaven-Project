import cron from 'node-cron';
import analyticsRepository from '../db/repositories/analyticsRepository.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Daily Analytics Aggregation Job
 * Runs every day at midnight to pre-calculate metrics
 */

export const startAnalyticsJob = () => {
    // Run at 00:00 (midnight) every day
    cron.schedule('0 0 * * *', async () => {
        logger.info('🔄 Running daily analytics aggregation...');

        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            // Calculate yesterday's metrics
            const metrics = await analyticsRepository.calculateDailyMetrics(yesterday);

            // Store in Analytics table
            const prisma = getPrisma();
            await prisma.$transaction([
                prisma.analytic.create({
                    data: {
                        date: yesterday,
                        metric: 'revenue_daily',
                        value: metrics.revenue
                    }
                }),
                prisma.analytic.create({
                    data: {
                        date: yesterday,
                        metric: 'orders_daily',
                        value: metrics.orders
                    }
                }),
                prisma.analytic.create({
                    data: {
                        date: yesterday,
                        metric: 'new_customers_daily',
                        value: metrics.newCustomers
                    }
                })
            ]);

            logger.info(`✅ Analytics aggregation completed for ${yesterday.toISOString().split('T')[0]}`);
        } catch (error) {
            logger.error('❌ Analytics aggregation failed:', error);
        }
    });

    logger.info('📅 Analytics aggregation job scheduled (Daily at 00:00)');
};

export default startAnalyticsJob;
