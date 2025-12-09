import { getPrisma } from '../config/database.js';
import { broadcastForceLogout } from '../config/websocket.js';
import logger from '../utils/logger.js';

/**
 * Get a specific setting by key
 */
export const getSetting = async (key) => {
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
        where: { key }
    });

    // Helper to parse value
    const parseValue = (key, value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;

        // Try parsing JSON for complex objects (like paymentMethods)
        if (value && (value.startsWith('{') || value.startsWith('['))) {
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        }

        return value;
    };

    // Parse boolean values and JSON
    if (setting) {
        return parseValue(key, setting.value);
    }

    return null;
};

/**
 * Get all settings
 */
export const getAllSettings = async () => {
    const prisma = getPrisma();
    const settings = await prisma.systemSetting.findMany();

    // Helper to parse value (reused)
    const parseValue = (value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value && (value.startsWith('{') || value.startsWith('['))) {
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        }
        return value;
    };

    return settings.reduce((acc, curr) => {
        acc[curr.key] = parseValue(curr.value);
        return acc;
    }, {});
};

/**
 * Update a setting
 */
export const updateSetting = async (key, value, userId) => {
    const prisma = getPrisma();

    const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: {
            value: String(value),
            updatedBy: userId
        },
        create: {
            key,
            value: String(value),
            updatedBy: userId
        }
    });

    // If enabling maintenance mode, record the start time and force logout non-admin users
    if ((key === 'maintenanceMode' || key === 'maintenance_mode') && String(value) === 'true') {
        const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
        await prisma.systemSetting.upsert({
            where: { key: 'maintenanceModeStartedAt' },
            update: { value: String(now), updatedBy: userId },
            create: { key: 'maintenanceModeStartedAt', value: String(now), updatedBy: userId }
        });

        // Get admin and super_admin user IDs to exclude from force logout
        const adminUsers = await prisma.user.findMany({
            where: { role: { in: ['admin', 'super_admin'] } },
            select: { id: true }
        });
        const adminIds = adminUsers.map(u => u.id);

        // Broadcast force logout to all non-admin connected WebSocket clients
        const disconnectedCount = broadcastForceLogout(adminIds);
        logger.warn(`[MAINTENANCE] Force logout broadcast sent to ${disconnectedCount} user connections`);
    }

    return setting;
};

export default {
    getSetting,
    getAllSettings,
    updateSetting
};
