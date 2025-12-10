import { getPrisma } from '../config/database.js';
import { broadcastForceLogout } from '../config/websocket.js';
import logger from '../utils/logger.js';

// ============================================
// IN-MEMORY CACHE FOR SETTINGS
// ============================================
// Settings change rarely but are read frequently (every cart request).
// Caching them in memory significantly reduces database round-trips.

let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the settings cache
 * Call this when settings are updated
 */
export const invalidateSettingsCache = () => {
    settingsCache = null;
    settingsCacheTime = 0;
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
 * Get all settings with IN-MEMORY CACHING
 * 
 * Settings are cached for 5 minutes to reduce DB calls.
 * Cache is invalidated when settings are updated.
 */
export const getAllSettings = async () => {
    const now = Date.now();

    // Return cached settings if still valid
    if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
        return settingsCache;
    }

    // Fetch from database
    const prisma = getPrisma();
    const settings = await prisma.systemSetting.findMany();

    // Parse and cache
    settingsCache = settings.reduce((acc, curr) => {
        acc[curr.key] = parseValue(curr.value);
        return acc;
    }, {});
    settingsCacheTime = now;

    logger.debug('[CACHE] Settings cache refreshed');
    return settingsCache;
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
