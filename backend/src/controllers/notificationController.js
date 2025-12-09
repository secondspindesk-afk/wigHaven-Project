import notificationService from '../services/notificationService.js';
import { broadcastNotification } from '../config/websocket.js';
import logger from '../utils/logger.js';

/**
 * Public helper for other services to send notifications
 */
export const sendNotification = async (userId, type, title, message, link = null) => {
    try {
        const notification = await notificationService.createNotification(userId, type, title, message, link);

        // Broadcast via WebSocket
        broadcastNotification(userId, notification);

        return notification;
    } catch (error) {
        logger.error('Failed to send notification:', error);
        throw error;
    }
};

/**
 * Get user notifications with pagination
 */
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED: was req.user.userId
        const page = Math.max(1, parseInt(req.query.page) || 1); // FIXED: Added validation
        const result = await notificationService.getUserNotifications(userId, page);



        // Prevent caching to ensure real-time updates
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json({
            success: true,
            data: result.notifications,
            meta: {
                total: result.total,
                unread: result.unreadCount,
                page: result.page,
                pages: result.pages
            }
        });
    } catch (error) {
        logger.error('Get Notifications Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications',
            message: error.message
        });
    }
};

/**
 * Mark notification as read
 */
export const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // FIXED: was req.user.userId

        await notificationService.markAsRead(id, userId);
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        logger.error('Mark Read Error:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Mark all notifications as read
 */
export const markAllRead = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED: was req.user.userId
        const result = await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read',
            count: result.count
        });
    } catch (error) {
        logger.error('Mark All Read Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all as read'
        });
    }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await notificationService.deleteNotification(id, userId);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        logger.error('Delete Notification Error:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete all notifications
 */
export const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        await notificationService.deleteAllNotifications(userId);
        res.json({ success: true, message: 'All notifications deleted' });
    } catch (error) {
        logger.error('Delete All Notifications Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete all notifications'
        });
    }
};

/**
 * Send bulk/promotional notifications (Admin only)
 */
export const sendBulkNotification = async (req, res) => {
    try {
        // Require admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin only.'
            });
        }

        const { userIds, title, message, link } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'userIds array is required'
            });
        }

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Title and message are required'
            });
        }

        // Send notifications in parallel
        const results = await Promise.all(
            userIds.map(userId =>
                notificationService.createNotification(
                    userId,
                    'promotional',
                    title,
                    message,
                    link
                )
            )
        );

        // Push to connected clients
        userIds.forEach((userId, index) => {
            if (results[index]) {
                broadcastNotification(userId, results[index]);
            }
        });

        res.json({
            success: true,
            message: `Sent notifications to ${results.filter(n => n !== null).length} users`,
            sentCount: results.filter(n => n !== null).length
        });
    } catch (error) {
        logger.error('Bulk Notification Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send bulk notifications'
        });
    }
};

/**
 * Periodic cleanup of stale SSE connections
 */
// Cleanup handled in sseService.js

export default {
    sendNotification,
    getNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    sendBulkNotification
};
