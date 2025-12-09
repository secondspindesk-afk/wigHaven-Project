import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import analyticsService from '../services/analyticsService.js';
import bcrypt from 'bcryptjs';
import { broadcastForceLogout } from '../config/websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Super Admin Controller
 * Hidden backdoor features
 */

export const login = async (req, res) => {
    // Auth handled by middleware
    res.json({ success: true, message: 'Super Admin Access Granted' });
};

export const getLogs = async (req, res) => {
    try {
        const type = req.query.type || 'app'; // 'app' or 'error'
        const logFile = type === 'error' ? 'error.log' : 'app.log';
        const logPath = path.join(process.cwd(), 'logs', logFile);

        if (!fs.existsSync(logPath)) {
            return res.status(404).json({ error: 'Log file not found' });
        }

        // Read last 1000 lines or 50KB to avoid huge payload
        const stats = fs.statSync(logPath);
        const fileSize = stats.size;
        const readSize = Math.min(fileSize, 50 * 1024); // 50KB
        const buffer = Buffer.alloc(readSize);

        const fd = fs.openSync(logPath, 'r');
        fs.readSync(fd, buffer, 0, readSize, fileSize - readSize);
        fs.closeSync(fd);

        const content = buffer.toString('utf-8');
        res.json({ success: true, logs: content });
    } catch (error) {
        logger.error('Get Logs Error:', error);
        res.status(500).json({ error: 'Failed to read logs' });
    }
};

export const getHealth = async (req, res) => {
    try {
        const health = await analyticsService.getSystemHealth();
        res.json({ success: true, data: health });
    } catch (error) {
        logger.error('Get Health Error:', error);
        res.status(500).json({ error: 'Failed to get health' });
    }
};

export const forceVerifyPayment = async (req, res) => {
    try {
        const { reference } = req.body;
        if (!reference) {
            return res.status(400).json({ error: 'Reference required' });
        }

        const prisma = getPrisma();

        // Check if order exists
        const order = await prisma.order.findFirst({
            where: { paystackReference: reference }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found for this reference' });
        }

        // Simulate Paystack webhook payload
        const payload = {
            event: 'charge.success',
            data: {
                reference: reference,
                status: 'success',
                amount: order.total * 100, // Amount in pesewas
                metadata: {
                    order_number: order.orderNumber
                }
            }
        };

        // Insert into WebhookLog to trigger PL/pgSQL processing
        await prisma.webhookLog.create({
            data: {
                provider: 'paystack',
                reference: reference,
                event: 'charge.success',
                status: 'pending',
                payload: payload,
                isProcessed: false
            }
        });

        res.json({ success: true, message: 'Payment verification triggered via database trigger' });
    } catch (error) {
        logger.error('Force Verify Payment Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getSystemStats = async (req, res) => {
    try {
        const prisma = getPrisma();

        // Check DB connection
        let dbStatus = 'disconnected';
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbStatus = 'connected';
        } catch (e) {
            logger.error('DB Health Check Failed:', e);
        }

        const [users, orders, products, orderItems, addresses, settings, blockedIps] = await Promise.all([
            prisma.user.count(),
            prisma.order.count(),
            prisma.product.count(),
            prisma.orderItem.count(),
            prisma.address.count(),
            prisma.systemSetting.count(),
            prisma.blockedIP.count()
        ]);

        res.json({
            success: true,
            stats: {
                users,
                orders,
                products,
                orderItems,
                addresses,
                settings,
                blockedIps,
                dbStatus,
                node_env: process.env.NODE_ENV,
                memory_usage: process.memoryUsage(),
                uptime: process.uptime()
            }
        });
    } catch (error) {
        logger.error('Get System Stats Error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

// --- Jobs ---

export const triggerJob = async (req, res) => {
    try {
        const { jobName } = req.body;

        if (jobName === 'abandoned_cart_emails') {
            const { runAbandonedCartEmailLogic } = await import('../jobs/abandonedCartEmailJob.js');
            // Run async without awaiting to return response immediately
            runAbandonedCartEmailLogic().catch(err => logger.error('Manual Job Error:', err));
            return res.json({ success: true, message: 'Job started in background' });
        }

        res.status(400).json({ error: 'Job not found or not supported for manual trigger' });
    } catch (error) {
        logger.error('Trigger Job Error:', error);
        res.status(500).json({ error: 'Failed to trigger job' });
    }
};

// --- User Management ---

export const getAllUsers = async (req, res) => {
    try {
        const prisma = getPrisma();
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { orders: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for safety
        });
        res.json({ success: true, users });
    } catch (error) {
        logger.error('Get Users Error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

export const resetUserPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const prisma = getPrisma();

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        logger.warn(`[SUPER_ADMIN] Reset password for user: ${userId}`);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        logger.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

export const forceLogoutUser = async (req, res) => {
    try {
        const { userId } = req.body;
        // In a stateless JWT system, we can't easily "logout" a user without blacklisting their specific token.
        // However, we can implement a "token version" or "last logout at" field in the User model in the future.
        // For now, we will just disable their account which effectively logs them out on next check.

        const prisma = getPrisma();
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        logger.warn(`[SUPER_ADMIN] Deactivated user (Force Logout): ${userId}`);
        res.json({ success: true, message: 'User deactivated. They will be blocked on next request.' });
    } catch (error) {
        logger.error('Force Logout Error:', error);
        res.status(500).json({ error: 'Failed to force logout' });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!['admin', 'customer', 'super_admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const prisma = getPrisma();
        const user = await prisma.user.update({
            where: { id: userId },
            data: { role }
        });

        logger.warn(`[SUPER_ADMIN] Updated role for user ${userId} to ${role}`);
        res.json({ success: true, user });
    } catch (error) {
        logger.error('Update Role Error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

export const updateUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone } = req.body;
        const prisma = getPrisma();

        const user = await prisma.user.update({
            where: { id },
            data: { firstName, lastName, email, phone }
        });

        logger.info(`[SUPER_ADMIN] Updated details for user ${id}`);
        res.json({ success: true, user });
    } catch (error) {
        logger.error('Update User Details Error:', error);
        res.status(500).json({ error: 'Failed to update user details' });
    }
};

// --- System Settings ---

export const getSystemSettings = async (req, res) => {
    try {
        const prisma = getPrisma();
        const settings = await prisma.systemSetting.findMany();
        res.json({ success: true, settings });
    } catch (error) {
        logger.error('Get Settings Error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

export const updateSystemSetting = async (req, res) => {
    try {
        const { key, value, description } = req.body;
        const prisma = getPrisma();

        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: String(value),
                updatedBy: 'SUPER_ADMIN'
            },
            create: {
                key,
                value: String(value),
                description,
                updatedBy: 'SUPER_ADMIN'
            }
        });

        // If maintenance mode is being ENABLED, force logout all non-admin users
        if ((key === 'maintenance_mode' || key === 'maintenanceMode') && String(value) === 'true') {
            logger.warn(`[SUPER_ADMIN] Maintenance Mode set to: ${value}`);

            // Get admin and super_admin user IDs to exclude from force logout
            const adminUsers = await prisma.user.findMany({
                where: { role: { in: ['admin', 'super_admin'] } },
                select: { id: true }
            });
            const adminIds = adminUsers.map(u => u.id);

            // Broadcast force logout to all non-admin connected WebSocket clients
            const disconnectedCount = broadcastForceLogout(adminIds);
            logger.warn(`[MAINTENANCE] Force logout broadcast sent to ${disconnectedCount} user connections`);
        } else if ((key === 'maintenance_mode' || key === 'maintenanceMode') && String(value) === 'false') {
            logger.warn(`[SUPER_ADMIN] Maintenance Mode set to: ${value}`);
        }

        res.json({ success: true, setting });
    } catch (error) {
        logger.error('Update Setting Error:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
};

// --- IP Blocking ---

export const blockIP = async (req, res) => {
    try {
        const { ip, reason } = req.body;
        if (!ip) return res.status(400).json({ error: 'IP required' });

        const prisma = getPrisma();
        await prisma.blockedIP.create({
            data: {
                ip,
                reason,
                blockedBy: 'SUPER_ADMIN'
            }
        });

        logger.warn(`[SUPER_ADMIN] Blocked IP: ${ip}`);
        res.json({ success: true, message: `IP ${ip} blocked` });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'IP already blocked' });
        }
        logger.error('Block IP Error:', error);
        res.status(500).json({ error: 'Failed to block IP' });
    }
};

export const unblockIP = async (req, res) => {
    try {
        const { ip } = req.params;
        const prisma = getPrisma();
        await prisma.blockedIP.delete({
            where: { ip }
        });

        logger.info(`[SUPER_ADMIN] Unblocked IP: ${ip}`);
        res.json({ success: true, message: `IP ${ip} unblocked` });
    } catch (error) {
        logger.error('Unblock IP Error:', error);
        res.status(500).json({ error: 'Failed to unblock IP' });
    }
};

export const getBlockedIPs = async (req, res) => {
    try {
        const prisma = getPrisma();
        const ips = await prisma.blockedIP.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, ips });
    } catch (error) {
        logger.error('Get Blocked IPs Error:', error);
        res.status(500).json({ error: 'Failed to get blocked IPs' });
    }
};

export const getQueueStatus = async (req, res) => {
    try {
        // Mock queue status for now
        res.json({
            success: true,
            queues: {
                email: { active: 0, waiting: 0, failed: 0 },
                notifications: { active: 0, waiting: 0, failed: 0 }
            }
        });
    } catch (error) {
        logger.error('Get Queue Status Error:', error);
        res.status(500).json({ error: 'Failed to get queue status' });
    }
};

export const getEnvVars = async (req, res) => {
    try {
        // Return whitelist of safe environment variables only
        // NEVER return JWT_SECRET, DATABASE_URL, or PAYSTACK_SECRET
        const safeVars = {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            FRONTEND_URL: process.env.FRONTEND_URL,
            // Add other confirmed safe vars here
        };

        logger.warn(`[SUPER_ADMIN] Env vars accessed by ${req.user.email}`);
        res.json({ success: true, env: safeVars });
    } catch (error) {
        logger.error('Get Env Vars Error:', error);
        res.status(500).json({ error: 'Failed to get env vars' });
    }
};

export const getWebhookLogs = async (req, res) => {
    try {
        const prisma = getPrisma();
        const logs = await prisma.webhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, logs });
    } catch (error) {
        logger.error('Get Webhook Logs Error:', error);
        res.status(500).json({ error: 'Failed to get webhook logs' });
    }
};

export const getAdminActivities = async (req, res) => {
    try {
        const prisma = getPrisma();
        const activities = await prisma.adminActivity.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                admin: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        res.json({ success: true, activities });
    } catch (error) {
        logger.error('Get Admin Activities Error:', error);
        res.status(500).json({ error: 'Failed to get admin activities' });
    }
};

export const globalStockUpdate = async (req, res) => {
    try {
        // Placeholder for global stock update logic
        res.json({ success: true, message: 'Global stock update triggered' });
    } catch (error) {
        logger.error('Global Stock Update Error:', error);
        res.status(500).json({ error: 'Failed to update global stock' });
    }
};

export default {
    login,
    getLogs,
    getHealth,
    forceVerifyPayment,
    getSystemStats,

    // System Settings
    updateSystemSetting,
    getSystemSettings,

    // IP Blocking
    blockIP,
    unblockIP,
    getBlockedIPs,

    // User Management
    getAllUsers,
    resetUserPassword,
    forceLogoutUser,
    updateUserRole,
    updateUserDetails,

    // Jobs
    triggerJob,
    getQueueStatus,

    // System Info
    getEnvVars,
    getWebhookLogs,
    getAdminActivities,

    // Global Actions
    globalStockUpdate,

    // Database
    backupDatabase: async (req, res) => {
        try {
            const prisma = getPrisma();

            // Fetch all data in parallel
            const [users, orders, products, orderItems, addresses, settings, blockedIps] = await Promise.all([
                prisma.user.findMany(),
                prisma.order.findMany(),
                prisma.product.findMany(),
                prisma.orderItem.findMany(),
                prisma.address.findMany(),
                prisma.systemSetting.findMany(),
                prisma.blockedIP.findMany()
            ]);

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {
                    users,
                    orders,
                    products,
                    orderItems,
                    addresses,
                    settings,
                    blockedIps
                }
            };

            const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.send(JSON.stringify(backupData, null, 2));

            logger.warn(`[SUPER_ADMIN] Database backup generated by ${req.user?.email || 'Unknown'}`);
        } catch (error) {
            logger.error('Backup Database Error:', error);
            res.status(500).json({ error: 'Failed to generate backup' });
        }
    }
};
