import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const createNotification = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.create({ data });
    } catch (error) {
        logger.error('Error creating notification:', error);
        throw error;
    }
};

export const findNotificationsByUserId = async (userId, skip = 0, take = 20) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        });
    } catch (error) {
        logger.error('Error finding notifications:', error);
        throw error;
    }
};

export const countNotifications = async (userId) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.count({ where: { userId } });
    } catch (error) {
        logger.error('Error counting notifications:', error);
        throw error;
    }
};

export const countUnreadNotifications = async (userId) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.count({ where: { userId, isRead: false } });
    } catch (error) {
        logger.error('Error counting unread notifications:', error);
        throw error;
    }
};

export const markNotificationAsRead = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        throw error;
    }
};

export const markAllNotificationsAsRead = async (userId) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
    } catch (error) {
        logger.error('Error marking all notifications as read:', error);
        throw error;
    }
};

export const findNotificationById = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.findUnique({ where: { id } });
    } catch (error) {
        logger.error('Error finding notification by ID:', error);
        throw error;
    }
};

export const deleteNotification = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.delete({ where: { id } });
    } catch (error) {
        logger.error('Error deleting notification:', error);
        throw error;
    }
};

export const deleteAllNotifications = async (userId) => {
    try {
        const prisma = getPrisma();
        return await prisma.notification.deleteMany({ where: { userId } });
    } catch (error) {
        logger.error('Error deleting all notifications:', error);
        throw error;
    }
};

export default {
    createNotification,
    findNotificationsByUserId,
    countNotifications,
    countUnreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    findNotificationById,
    deleteNotification,
    deleteAllNotifications
};
