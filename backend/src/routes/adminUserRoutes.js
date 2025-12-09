import express from 'express';
import userRepository from '../db/repositories/userRepository.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get all users (Admin)
 * GET /api/admin/users
 */
router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        const result = await userRepository.getAllUsers({
            page: parseInt(page),
            limit: parseInt(limit),
            search: search || '',
        });

        res.json({
            success: true,
            data: result.users,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get user details (Admin)
 * GET /api/admin/users/:id
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await userRepository.getUserDetails(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hide super_admin users from regular admins
        if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Ban user (Admin)
 * PATCH /api/admin/users/:id/ban
 */
router.patch('/:id/ban', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if target is admin/super_admin - prevent banning
        const targetUser = await userRepository.findUserById(id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot ban admin users'
            });
        }

        const user = await userRepository.updateUserActiveStatus(id, false);

        logger.debug(`User ${id} banned by admin ${req.user.id}`);

        res.json({
            success: true,
            data: user,
            message: 'User banned successfully',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Unban user (Admin)
 * PATCH /api/admin/users/:id/unban
 */
router.patch('/:id/unban', async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await userRepository.updateUserActiveStatus(id, true);

        logger.debug(`User ${id} unbanned by admin ${req.user.id}`);

        res.json({
            success: true,
            data: user,
            message: 'User unbanned successfully',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
