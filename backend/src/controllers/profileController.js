import profileService from '../services/profileService.js';
import logger from '../utils/logger.js';

/**
 * Get user profile
 */
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11: was req.user.userId
        const user = await profileService.getProfile(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        logger.error('Get Profile Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
};

/**
 * Update profile with validation
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const { firstName, lastName, phone } = req.body;

        // Validate at least one field is provided
        if (!firstName && !lastName && phone === undefined) {
            return res.status(400).json({
                success: false,
                error: 'At least one field must be provided for update'
            });
        }

        const user = await profileService.updateProfile(userId, { firstName, lastName, phone });

        res.json({
            success: true,
            data: user,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        logger.error('Update Profile Error:', error);

        // FIXED BUG #15: Better error messages
        if (error.message.includes('must be') || error.message.includes('invalid')) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            message: error.message
        });
    }
};

/**
 * Update password with validation
 */
export const updatePassword = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        // Validate password confirmation
        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'New password and confirmation do not match'
            });
        }

        // Prevent same password
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                error: 'New password must be different from current password'
            });
        }

        await profileService.updatePassword(userId, currentPassword, newPassword);

        // Notify user of security event
        const notificationService = (await import('../services/notificationService.js')).default;
        await notificationService.notifyPasswordChanged(userId);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        logger.error('Update Password Error:', error);

        // FIXED BUG #15: Specific error messages
        if (error.message === 'Current password is incorrect') {
            return res.status(401).json({ success: false, error: error.message });
        }
        if (error.message.includes('Password must')) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update password'
        });
    }
};

/**
 * Deactivate account
 */
export const deactivateAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;

        // Soft delete user
        const prisma = (await import('../config/database.js')).getPrisma();
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        // Send email
        const emailService = (await import('../services/emailService.js'));
        await emailService.sendAccountDeactivated(user, reason);

        res.json({
            success: true,
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add address
 */
export const addAddress = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const address = await profileService.addAddress(userId, req.body);

        res.status(201).json({
            success: true,
            data: address,
            message: 'Address added successfully'
        });
    } catch (error) {
        logger.error('Add Address Error:', error);

        // FIXED BUG #15: Better error messages
        if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('too long')) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to add address',
            message: error.message
        });
    }
};

/**
 * Update address
 */
export const updateAddress = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Address ID is required'
            });
        }

        const address = await profileService.updateAddress(userId, id, req.body);

        res.json({
            success: true,
            data: address,
            message: 'Address updated successfully'
        });
    } catch (error) {
        logger.error('Update Address Error:', error);

        // FIXED BUG #15: Better error messages
        if (error.message === 'Address not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message === 'Access denied') {
            return res.status(403).json({ success: false, error: error.message });
        }
        if (error.message.includes('too long') || error.message.includes('Invalid')) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update address',
            message: error.message
        });
    }
};

/**
 * Delete address
 */
export const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Address ID is required'
            });
        }

        await profileService.deleteAddress(userId, id);

        res.json({
            success: true,
            message: 'Address deleted successfully'
        });
    } catch (error) {
        logger.error('Delete Address Error:', error);

        // FIXED BUG #15: Better error messages
        if (error.message === 'Address not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message === 'Access denied') {
            return res.status(403).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to delete address',
            message: error.message
        });
    }
};

export default {
    getProfile,
    updateProfile,
    updatePassword,
    addAddress,
    updateAddress,
    deleteAddress,
    deactivateAccount
};
