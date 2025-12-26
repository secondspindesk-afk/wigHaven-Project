import notificationRepository from '../db/repositories/notificationRepository.js';
import logger from '../utils/logger.js';
import { broadcastNotification } from '../config/websocket.js';
import { getPrisma } from '../config/database.js';
import adminBroadcast from '../utils/adminBroadcast.js';
import smartCache from '../utils/smartCache.js';

/**
 * Notification Types Constant
 */
export const NotificationTypes = {
    // User notifications (personal activity)
    WELCOME: 'welcome',
    ORDER_PLACED: 'order_placed',
    ORDER_STATUS: 'order_status',
    PAYMENT: 'payment',
    SECURITY: 'security',
    REVIEW: 'review',
    ORDER_CANCELLED: 'order_cancelled',
    BACK_IN_STOCK: 'back_in_stock',
    PROMOTIONAL: 'promotional',
    ORDER_REFUNDED: 'order_refunded',
    EMAIL_VERIFIED: 'email_verified',
    REVIEW_APPROVED: 'review_approved',
    REVIEW_REJECTED: 'review_rejected',
    SALE_ALERT: 'sale_alert',
    SUPPORT_REPLY: 'support_reply',
    SUPPORT_RESOLVED: 'support_resolved',

    // Admin notifications (CRITICAL BUSINESS EVENTS ONLY)
    ADMIN_NEW_ORDER: 'admin_new_order',
    ADMIN_LOW_STOCK: 'admin_low_stock',
    ADMIN_OUT_OF_STOCK: 'admin_out_of_stock',
    ADMIN_NEW_REVIEW: 'admin_new_review',
    ADMIN_PAYMENT_FAILED: 'admin_payment_failed',
    ADMIN_MILESTONE: 'admin_milestone',
    ADMIN_SUPPORT_REPLY: 'admin_support_reply',
};

/**
 * Internal helper to create notification
 */
const createNotification = async (userId, type, title, message, link = null, data = null) => {
    try {
        logger.info(`Creating notification for user ${userId}: ${type} - ${title}`);

        // FIXED: Set expiry date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const notification = await notificationRepository.createNotification({
            userId,
            type,
            title,
            message,
            link,
            data,
            isRead: false,
            expiresAt
        });

        // Broadcast via WebSocket
        broadcastNotification(userId, notification);

        logger.info(`Notification created successfully: ${notification.id}`);
        return notification;
    } catch (error) {
        logger.error(`Failed to create notification (${type}) for user ${userId}:`, error);
        // Don't throw, just log. Notifications shouldn't break main flow.
        return null;
    }
};

/**
 * Notify user of successful registration
 */
export const notifyWelcome = async (user) => {
    const settingsService = (await import('./settingsService.js')).default;
    const siteName = await settingsService.getSetting('siteName') || 'WigHaven';

    return createNotification(
        user.id,
        NotificationTypes.WELCOME,
        `Welcome to ${siteName}!`,
        'Thank you for creating an account. We are excited to have you with us.',
        '/shop'
    );
};

/**
 * Notify user of order placement
 */
export const notifyOrderPlaced = async (order) => {
    // Guard for guest orders (no userId)
    if (!order.userId) {
        return null;
    }

    const settingsService = (await import('./settingsService.js')).default;
    const currencySymbol = await settingsService.getSetting('currencySymbol') || '₵';

    return createNotification(
        order.userId,
        NotificationTypes.ORDER_PLACED,
        `Order Placed #${order.orderNumber}`,
        `Your order for ${currencySymbol}${order.total} has been placed successfully.`,
        `/account/orders/${order.orderNumber}`,
        { orderNumber: order.orderNumber }
    );
};

/**
 * Notify user of order status change
 */
export const notifyOrderStatusChanged = async (order, oldStatus, newStatus) => {
    const statusMessages = {
        processing: 'is now being processed.',
        shipped: 'has been shipped! Track your package.',
        delivered: 'has been delivered. Enjoy your purchase!',
        cancelled: 'has been cancelled.',
        refunded: 'has been refunded.'
    };

    const message = statusMessages[newStatus] || `status has changed to ${newStatus}.`;

    return createNotification(
        order.userId,
        NotificationTypes.ORDER_STATUS,
        `Order Update #${order.orderNumber}`,
        `Your order ${message}`,
        `/account/orders/${order.orderNumber}`,
        { orderNumber: order.orderNumber, status: newStatus }
    );
};

/**
 * Notify user of successful payment
 */
export const notifyPaymentSuccess = async (order) => {
    const settingsService = (await import('./settingsService.js')).default;
    const currencySymbol = await settingsService.getSetting('currencySymbol') || '₵';

    return createNotification(
        order.userId,
        NotificationTypes.PAYMENT,
        `Payment Confirmed #${order.orderNumber}`,
        `We have received your payment of ${currencySymbol}${order.total}. We will start processing your order shortly.`,
        `/account/orders/${order.orderNumber}`,
        { orderNumber: order.orderNumber }
    );
};


/**
 * Notify user of password change
 */
export const notifyPasswordChanged = async (userId) => {
    return createNotification(
        userId,
        NotificationTypes.SECURITY,
        'Security Alert: Password Changed',
        'Your password was recently changed. If this wasn\'t you, please contact support immediately.',
        '/account/profile'
    );
};

/**
 * Notify user of review submission
 */
export const notifyReviewSubmitted = async (review, product) => {
    return createNotification(
        review.userId,
        NotificationTypes.REVIEW,
        'Review Submitted',
        `Thanks for reviewing "${product.name}". Your feedback helps others!`,
        `/shop/product/${product.id}`
    );
};

/**
 * Notify user of order cancellation
 */
export const notifyOrderCancelled = async (order, reason = 'Payment not received within time limit') => {
    if (!order.userId) {
        // Guest order, can't send notification
        return null;
    }

    return createNotification(
        order.userId,
        NotificationTypes.ORDER_CANCELLED,
        `Order Cancelled #${order.orderNumber}`,
        `Your order has been automatically cancelled. Reason: ${reason}`,
        `/account/orders/${order.orderNumber}`,
        { orderNumber: order.orderNumber }
    );
};

/**
 * Notify user of back-in-stock product
 */
export const notifyBackInStock = async (user, variant) => {
    return createNotification(
        user.id,
        NotificationTypes.BACK_IN_STOCK,
        `${variant.product.name} is Back in Stock!`,
        'The item you were waiting for is now available. Get it before it\'s gone!',
        `/products/${variant.productId}`
    );
};

/**
 * Notify ALL admins (for critical business events ONLY)
 */
const notifyAllAdmins = async (type, title, message, link = null) => {
    try {
        const prisma = getPrisma();
        const admins = await prisma.user.findMany({
            where: {
                role: { in: ['admin', 'super_admin'] },
                isActive: true
            },
            select: { id: true }
        });

        if (admins.length === 0) {
            logger.warn('No active admins to notify');
            return [];
        }

        const notifications = await Promise.all(
            admins.map(admin =>
                createNotification(admin.id, type, title, message, link)
            )
        );

        logger.info(`Notified ${admins.length} admins: ${type}`);
        return notifications.filter(n => n !== null);
    } catch (error) {
        logger.error('Error notifying admins:', error);
        return [];
    }
};

/**
 * Broadcast promotional notification to ALL active users
 * OPTIMIZED: Uses createMany for batch insert (100x fewer DB calls)
 */
const broadcastToAllUsers = async (type, title, message, link = null) => {
    try {
        const prisma = getPrisma();

        // Get count first
        const userCount = await prisma.user.count({
            where: { isActive: true, role: 'customer' }
        });

        logger.info(`[PERF] Broadcasting to ${userCount} users with batch inserts...`);

        // OPTIMIZATION: Set expiry date once (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Process in batches of 500 (increased from 100 since we're using createMany)
        const batchSize = 500;
        let processedCount = 0;

        for (let skip = 0; skip < userCount; skip += batchSize) {
            const batch = await prisma.user.findMany({
                where: { isActive: true, role: 'customer' },
                select: { id: true },
                skip,
                take: batchSize
            });

            // OPTIMIZATION: Single batch insert instead of N individual creates
            const notificationsData = batch.map(user => ({
                userId: user.id,
                type,
                title,
                message,
                link,
                isRead: false,
                expiresAt
            }));

            // createMany = 1 DB call for entire batch
            await prisma.notification.createMany({
                data: notificationsData,
                skipDuplicates: true
            });

            // Broadcast via WebSocket (still individual for real-time push)
            batch.forEach(user => {
                broadcastNotification(user.id, { type, title, message, link, isRead: false });
            });

            processedCount += batch.length;
            logger.info(`[PERF] Batch inserted ${batch.length} notifications (${processedCount}/${userCount})`);
        }

        logger.info(`[PERF] Broadcast complete: ${processedCount} notifications via createMany`);
        return { sentCount: processedCount };
    } catch (error) {
        logger.error('Error broadcasting to users:', error);
        return { sentCount: 0, error: error.message };
    }
};


// ============================================
// ADMIN NOTIFICATIONS (CRITICAL EVENTS ONLY)
// ============================================

/**
 * Notify admins: New order placed (CRITICAL - new revenue)
 */
export const notifyAdminNewOrder = async (order) => {
    const settingsService = (await import('./settingsService.js')).default;
    const currencySymbol = await settingsService.getSetting('currencySymbol') || '₵';
    let message = `${currencySymbol}${order.total} from ${order.customerEmail}`;
    if (order.couponCode || order.coupon_code) {
        message += ` (Used coupon: ${order.couponCode || order.coupon_code})`;
    }


    return notifyAllAdmins(
        NotificationTypes.ADMIN_NEW_ORDER,
        `New Order #${order.orderNumber}`,
        message,
        `/admin/orders/${order.id}`
    );
};

/**
 * Notify admins: Low stock (CRITICAL - needs restocking)
 */
export const notifyAdminLowStock = async (variant, product) => {
    if (variant.stock <= 0) {
        return notifyAdminOutOfStock(variant, product);
    }

    return notifyAllAdmins(
        NotificationTypes.ADMIN_LOW_STOCK,
        `⚠️ Low Stock: ${product.name}`,
        `Only ${variant.stock} units left (SKU: ${variant.sku})`,
        `/admin/inventory`
    );
};

/**
 * Notify admins: Out of stock (CRITICAL - lost sales)
 */
export const notifyAdminOutOfStock = async (variant, product) => {
    return notifyAllAdmins(
        NotificationTypes.ADMIN_OUT_OF_STOCK,
        `🚨 OUT OF STOCK: ${product.name}`,
        `SKU ${variant.sku} is now out of stock!`,
        `/admin/inventory`
    );
};

/**
 * Notify admins: New review (for moderation)
 */
export const notifyAdminNewReview = async (review, product) => {
    return notifyAllAdmins(
        NotificationTypes.ADMIN_NEW_REVIEW,
        'New Review Awaiting Moderation',
        `${product.name} - ${review.rating}★`,
        `/admin/reviews/${review.id}`
    );
};

/**
 * Notify admins: Payment verification failed (CRITICAL - needs investigation)
 */
export const notifyAdminPaymentFailed = async (order, reason) => {
    return notifyAllAdmins(
        NotificationTypes.ADMIN_PAYMENT_FAILED,
        `💳 Payment Issue: #${order.orderNumber}`,
        `Reason: ${reason}`,
        `/admin/orders/${order.id}`
    );
};

/**
 * Notify admins: Business milestone achieved (CELEBRATION)
 */
export const notifyAdminMilestone = async (type, threshold, currentValue) => {
    const settingsService = (await import('./settingsService.js')).default;
    const currencySymbol = await settingsService.getSetting('currencySymbol') || '₵';
    const messages = {
        order_count: `🎉 ${currentValue} orders processed!`,
        daily_sales: `💰 Daily sales hit ${currencySymbol}${currentValue}!`,
        monthly_revenue: `📈 Monthly revenue: ${currencySymbol}${currentValue}!`
    };


    return notifyAllAdmins(
        NotificationTypes.ADMIN_MILESTONE,
        'Milestone Achieved! 🎊',
        messages[type] || `Milestone: ${currentValue}`,
        '/admin/dashboard'
    );
};

/**
 * Notify admins: User replied to support ticket (needs attention)
 */
export const notifyAdminSupportReply = async (ticket, userName) => {
    const displayName = userName || 'A customer';
    return notifyAllAdmins(
        NotificationTypes.ADMIN_SUPPORT_REPLY,
        `💬 Support Reply - Ticket #${ticket.ticketNumber}`,
        `${displayName} replied to: "${ticket.subject.substring(0, 40)}${ticket.subject.length > 40 ? '...' : ''}"`,
        `/admin/support?ticket=${ticket.id}`
    );
};

/**
 * Notify admins: New support ticket created
 */
export const notifyAdminNewTicket = async (ticket, userName) => {
    const displayName = userName || 'A customer';
    return notifyAllAdmins(
        NotificationTypes.ADMIN_SUPPORT_REPLY, // Reuse type for frontend compatibility
        `🆕 New Support Ticket #${ticket.ticketNumber}`,
        `${displayName} created ticket: "${ticket.subject.substring(0, 40)}${ticket.subject.length > 40 ? '...' : ''}"`,
        `/admin/support?ticket=${ticket.id}`
    );
};

// ============================================
// USER NOTIFICATIONS (PERSONAL ACTIVITY)
// ============================================

/**
 * Notify user: Order refunded
 */
export const notifyOrderRefunded = async (order) => {
    if (!order.userId) return null;

    const settingsService = (await import('./settingsService.js')).default;
    const currencySymbol = await settingsService.getSetting('currencySymbol') || '₵';

    return createNotification(
        order.userId,
        NotificationTypes.ORDER_REFUNDED,
        `Order Refunded #${order.orderNumber}`,
        `Your payment of ${currencySymbol}${order.total} has been refunded. It may take 3-5 business days to appear in your account.`,
        `/account/orders/${order.orderNumber}`,
        { orderNumber: order.orderNumber }
    );

};

/**
 * Notify user: Email verified
 */
export const notifyEmailVerified = async (userId) => {
    return createNotification(
        userId,
        NotificationTypes.EMAIL_VERIFIED,
        'Email Verified! ✅',
        'Your email has been verified. You now have full access to all features.',
        '/account/profile'
    );
};

/**
 * Notify user: Review approved
 */
export const notifyReviewApproved = async (review, product) => {
    if (!review.userId) return null;

    return createNotification(
        review.userId,
        NotificationTypes.REVIEW_APPROVED,
        'Review Approved ✅',
        `Your review for "${product.name}" is now live!`,
        `/shop/product/${product.id}`
    );
};

/**
 * Notify user: Review rejected
 */
export const notifyReviewRejected = async (review, product, reason) => {
    if (!review.userId) return null;

    return createNotification(
        review.userId,
        NotificationTypes.REVIEW_REJECTED,
        'Review Not Approved',
        `Your review for "${product.name}" was not approved. ${reason || 'It may not meet our community guidelines.'}`,
        '/account/profile'
    );
};

/**
 * Broadcast promotional campaign to all users
 */
export const notifyPromotionalCampaign = async (title, message, link) => {
    return broadcastToAllUsers(
        NotificationTypes.PROMOTIONAL,
        title,
        message,
        link
    );
};

/**
 * Notify specific user about sale/promotion
 */
export const notifySaleAlert = async (userId, title, message, link) => {
    return createNotification(
        userId,
        NotificationTypes.SALE_ALERT,
        title,
        message,
        link
    );
};

/**
 * Notify user of admin reply to their support ticket
 * @param {string} userId - User ID
 * @param {object} ticket - Support ticket with ticketNumber
 * @returns {Promise} Notification object
 */
export const notifySupportReply = async (userId, ticket) => {
    if (!userId) return null;

    return createNotification(
        userId,
        NotificationTypes.SUPPORT_REPLY,
        `Support Reply - Ticket #${ticket.ticketNumber}`,
        `Our team has responded to your support request: "${ticket.subject.substring(0, 50)}${ticket.subject.length > 50 ? '...' : ''}"`,
        `/account/support/${ticket.id}`
    );
};

/**
 * Notify user that their support ticket has been resolved
 * @param {string} userId - User ID
 * @param {object} ticket - Support ticket with ticketNumber
 * @returns {Promise} Notification object
 */
export const notifySupportResolved = async (userId, ticket) => {
    if (!userId) return null;

    return createNotification(
        userId,
        NotificationTypes.SUPPORT_RESOLVED,
        `Ticket #${ticket.ticketNumber} Resolved`,
        `Your support request "${ticket.subject.substring(0, 50)}${ticket.subject.length > 50 ? '...' : ''}" has been marked as resolved.`,
        `/account/support/${ticket.id}`
    );
};

/**
 * Get user notifications with pagination and limits
 */
export const getUserNotifications = async (userId, page = 1, limit = 20) => {
    // FIXED BUG #4: Validate pagination
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // FIXED BUG #14: Max 100 per request
    const skip = Math.max(0, (safePage - 1) * safeLimit);

    const cacheKey = smartCache.keys.userNotifications(userId, safePage, safeLimit);

    return smartCache.getOrFetch(
        cacheKey,
        async () => {
            const [notifications, total, unreadCount] = await Promise.all([
                notificationRepository.findNotificationsByUserId(userId, skip, safeLimit),
                notificationRepository.countNotifications(userId),
                notificationRepository.countUnreadNotifications(userId)
            ]);

            return {
                notifications,
                total,
                unreadCount,
                page: safePage,
                limit: safeLimit,
                pages: Math.ceil(total / safeLimit)
            };
        },
        { type: 'notifications', swr: true }
    );
};

/**
 * Mark notification as read with ownership verification
 */
export const markAsRead = async (id, userId) => {
    const notification = await notificationRepository.findNotificationById(id);

    if (!notification) {
        throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
        throw new Error('Access denied');
    }

    const result = await notificationRepository.markNotificationAsRead(id);
    await adminBroadcast.notifyNotificationsChanged(userId);
    return result;
};

/**
 * Mark all user notifications as read
 */
export const markAllAsRead = async (userId) => {
    const result = await notificationRepository.markAllNotificationsAsRead(userId);
    await adminBroadcast.notifyNotificationsChanged(userId);
    return result;
};

/**
 * Delete notification with ownership verification
 */
export const deleteNotification = async (id, userId) => {
    const notification = await notificationRepository.findNotificationById(id);

    if (!notification) {
        throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
        throw new Error('Access denied');
    }

    const result = await notificationRepository.deleteNotification(id);
    await adminBroadcast.notifyNotificationsChanged(userId);
    return result;
};

/**
 * Delete all notifications for a user
 */
export const deleteAllNotifications = async (userId) => {
    const result = await notificationRepository.deleteAllNotifications(userId);
    await adminBroadcast.notifyNotificationsChanged(userId);
    return result;
};

export default {
    // Internal helper (not exported directly for safety)
    // createNotification,

    // User notifications
    notifyWelcome,
    notifyOrderPlaced,
    notifyOrderStatusChanged,
    notifyOrderCancelled,
    notifyOrderRefunded,
    notifyPaymentSuccess,
    notifyPasswordChanged,
    notifyReviewSubmitted,
    notifyReviewApproved,
    notifyReviewRejected,
    notifyBackInStock,
    notifyEmailVerified,
    notifyPromotionalCampaign,
    notifySaleAlert,
    notifySupportReply,
    notifySupportResolved,

    // Admin notifications (CRITICAL ONLY)
    notifyAdminNewOrder,
    notifyAdminLowStock,
    notifyAdminOutOfStock,
    notifyAdminNewReview,
    notifyAdminPaymentFailed,
    notifyAdminMilestone,
    notifyAdminSupportReply,
    notifyAdminNewTicket,

    // Utilities
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
};
