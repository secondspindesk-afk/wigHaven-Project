import axios from './axios';

export interface Notification {
    id: string;
    userId: string;
    type: 'welcome' | 'order_placed' | 'order_payment_confirmed' | 'order_status' | 'payment' | 'security' | 'review' | 'order_cancelled' | 'back_in_stock' | 'promotional' | 'order_refunded' | 'email_verified' | 'review_approved' | 'review_rejected' | 'sale_alert' | 'support_reply' | 'support_resolved' | 'admin_new_order' | 'admin_low_stock' | 'admin_out_of_stock' | 'admin_new_review' | 'admin_payment_failed' | 'admin_milestone' | 'admin_support_reply';
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, any>; // Optional metadata (orderNumber, productId, ticketId, etc.)
}

export interface NotificationsResponse {
    success: boolean;
    data: Notification[];
    meta: {
        total: number;
        unread: number;
        page: number;
        pages: number;
    };
}

export const notificationService = {
    // Get all notifications
    getNotifications: async (page = 1) => {
        const response = await axios.get<NotificationsResponse>(`/notifications?page=${page}`);
        return response.data;
    },

    // Mark single notification as read
    markAsRead: async (id: string) => {
        const response = await axios.patch<{ success: boolean; message: string }>(`/notifications/${id}/read`);
        return response.data;
    },

    // Mark all as read
    markAllAsRead: async () => {
        const response = await axios.post<{ success: boolean; message: string; count: number }>('/notifications/read-all');
        return response.data;
    },

    // Delete notification
    deleteNotification: async (id: string) => {
        const response = await axios.delete<{ success: boolean; message: string }>(`/notifications/${id}`);
        return response.data;
    },

    // Delete all notifications
    deleteAllNotifications: async () => {
        const response = await axios.delete<{ success: boolean; message: string }>('/notifications/all');
        return response.data;
    },

    // Subscribe to SSE (This returns the EventSource URL)
    getSubscriptionUrl: () => {
        const baseURL = import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/api`
            : '/api';
        return `${baseURL}/notifications/subscribe`;
    }
};

export default notificationService;
