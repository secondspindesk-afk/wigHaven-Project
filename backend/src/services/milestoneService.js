import { getPrisma } from '../config/database.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * Initialize default milestones
 * Uses batch operation for efficiency (single DB round-trip instead of 8)
 */
export const initializeMilestones = async () => {
    const prisma = getPrisma();

    const defaultMilestones = [
        { type: 'order_count', threshold: 10 },
        { type: 'order_count', threshold: 50 },
        { type: 'order_count', threshold: 100 },
        { type: 'order_count', threshold: 500 },
        { type: 'order_count', threshold: 1000 },
        { type: 'daily_sales', threshold: 1000 },
        { type: 'daily_sales', threshold: 5000 },
        { type: 'daily_sales', threshold: 10000 },
    ];

    try {
        // Use createMany with skipDuplicates for single DB call
        // This is ~8x faster than individual upserts
        const result = await prisma.adminMilestone.createMany({
            data: defaultMilestones,
            skipDuplicates: true, // Ignore if already exists
        });

        if (result.count > 0) {
            logger.info(`✓ Created ${result.count} new milestones`);
        } else {
            logger.info('✓ Milestones initialized (all exist)');
        }
    } catch (error) {
        // Fallback: If createMany fails, log and continue
        // Milestones might already exist from previous startup
        logger.warn(`Milestones init: ${error.message}`);
    }
};

/**
 * Check and update order count milestone
 */
export const checkOrderMilestone = async () => {
    const prisma = getPrisma();

    try {
        const totalOrders = await prisma.order.count({
            where: { status: { not: 'cancelled' } }
        });

        const milestones = await prisma.adminMilestone.findMany({
            where: {
                type: 'order_count',
                isReached: false,
                threshold: { lte: totalOrders }
            }
        });

        for (const milestone of milestones) {
            await prisma.adminMilestone.update({
                where: { id: milestone.id },
                data: {
                    isReached: true,
                    reachedAt: new Date(),
                    currentValue: totalOrders,
                    notifiedAdmins: true
                }
            });

            await notificationService.notifyAdminMilestone(
                'order_count',
                milestone.threshold,
                totalOrders
            );

            logger.info(`Milestone reached: ${totalOrders} orders`);
        }
    } catch (error) {
        logger.error('Error checking order milestone:', error);
    }
};

/**
 * Check daily sales milestone
 */
export const checkDailySalesMilestone = async () => {
    const prisma = getPrisma();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const dailySales = await prisma.order.aggregate({
            where: {
                status: { not: 'cancelled' },
                paymentStatus: 'paid',
                createdAt: { gte: today }
            },
            _sum: { total: true }
        });

        const totalSales = parseFloat(dailySales._sum.total || 0);

        const milestones = await prisma.adminMilestone.findMany({
            where: {
                type: 'daily_sales',
                isReached: false,
                threshold: { lte: totalSales }
            }
        });

        for (const milestone of milestones) {
            await prisma.adminMilestone.update({
                where: { id: milestone.id },
                data: {
                    isReached: true,
                    reachedAt: new Date(),
                    currentValue: totalSales,
                    notifiedAdmins: true
                }
            });

            await notificationService.notifyAdminMilestone(
                'daily_sales',
                milestone.threshold,
                totalSales
            );
        }
    } catch (error) {
        logger.error('Error checking daily sales milestone:', error);
    }
};

/**
 * Reset daily milestones (run daily at midnight)
 */
export const resetDailyMilestones = async () => {
    const prisma = getPrisma();

    try {
        await prisma.adminMilestone.updateMany({
            where: { type: 'daily_sales' },
            data: {
                isReached: false,
                currentValue: 0,
                notifiedAdmins: false
            }
        });

        logger.info('Daily milestones reset');
    } catch (error) {
        logger.error('Error resetting daily milestones:', error);
    }
};

export default {
    initializeMilestones,
    checkOrderMilestone,
    checkDailySalesMilestone,
    resetDailyMilestones
};
