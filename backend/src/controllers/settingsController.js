import settingsService from '../services/settingsService.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get all settings
 */
export const getSettings = async (req, res) => {
    try {
        const settings = await settingsService.getAllSettings();

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Get Settings Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
        });
    }
};

/**
 * Update a setting
 */
export const updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        const userId = req.user.id;

        if (!key) {
            return res.status(400).json({
                success: false,
                error: 'Setting key is required'
            });
        }

        const setting = await settingsService.updateSetting(key, value, userId);
        const prisma = getPrisma();

        // Log admin activity
        await prisma.adminActivity.create({
            data: {
                adminId: userId,
                action: 'update_setting',
                entityType: 'system_setting',
                entityId: setting.id,
                changes: { key, value },
                ipAddress: req.ip
            }
        });

        res.json({
            success: true,
            data: { [setting.key]: setting.value },
            message: 'Setting updated successfully'
        });
    } catch (error) {
        logger.error('Update Setting Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update setting'
        });
    }
}


/**
 * Get public settings (No auth required)
 */
export const getPublicSettings = async (req, res) => {
    try {
        const settings = await settingsService.getAllSettings();

        // Whitelist public keys
        const publicKeys = [
            'siteName',
            'supportEmail',
            'socialLinks',
            'paymentMethods',
            'shippingFlatRate',
            'freeShippingThreshold',
            'maintenanceMode',
            'currency'
        ];

        const publicSettings = Object.keys(settings)
            .filter(key => publicKeys.includes(key))
            .reduce((obj, key) => {
                obj[key] = settings[key];
                return obj;
            }, {});

        res.json({
            success: true,
            data: publicSettings
        });
    } catch (error) {
        logger.error('Get Public Settings Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
        });
    }
};

export default {
    getSettings,
    updateSetting,
    getPublicSettings
};
