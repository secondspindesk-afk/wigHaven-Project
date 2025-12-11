import { getPrisma } from '../config/database.js';
import { broadcastForceLogout } from '../config/websocket.js';
import { invalidateMaintenanceCache } from '../middleware/maintenanceMode.js';
import logger from '../utils/logger.js';

import cache from '../utils/cache.js';
import smartCache from '../utils/smartCache.js';

/**
 * Invalidate the settings cache
 * Call this when settings are updated
 */
export const invalidateSettingsCache = () => {
    // Invalidate both old and new cache for safety
    cache.del('settings:all');
    smartCache.del(smartCache.keys.settings());
    smartCache.del(smartCache.keys.settingsPublic());
    logger.info('[CACHE] Settings cache invalidated');
};

/**
 * Helper to parse setting values
 */
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

/**
 * Get a specific setting by key
 * Note: Individual settings are NOT cached to ensure critical reads are fresh
 */
export const getSetting = async (key) => {
    const prisma = getPrisma();
    const setting = await prisma.systemSetting.findUnique({
        where: { key }
    });

    if (setting) {
        return parseValue(setting.value);
    }

    return null;
};

/**
 * Fetch all settings from database (internal helper)
 */
const fetchAllSettingsFromDB = async () => {
    const prisma = getPrisma();
    const settings = await prisma.systemSetting.findMany();

    return settings.reduce((acc, curr) => {
        acc[curr.key] = parseValue(curr.value);
        return acc;
    }, {});
};

/**
 * Get all settings with SMART CACHING
 * 
 * Features:
 * - Request deduplication (concurrent requests share one DB call)
 * - SWR (stale-while-revalidate) for instant responses
 * - 5 minute TTL
 */
export const getAllSettings = async () => {
    return smartCache.getOrFetch(
        smartCache.keys.settings(),
        fetchAllSettingsFromDB,
        { type: 'settings', swr: true }
    );
};

/**
 * Update a setting
 * IMPORTANT: Invalidates cache after update
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

    // INVALIDATE CACHE after updating a setting
    invalidateSettingsCache();

    // Always invalidate maintenance cache when maintenance mode setting changes
    if (key === 'maintenanceMode' || key === 'maintenance_mode') {
        invalidateMaintenanceCache();
    }

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
    updateSetting,
    invalidateSettingsCache
};
