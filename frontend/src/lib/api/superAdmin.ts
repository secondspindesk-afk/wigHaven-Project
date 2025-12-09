import api from './axios';

// ==================== SUPER ADMIN API ====================
// These endpoints require x-super-admin-email and x-super-admin-secret headers

// Get super admin credentials from env or storage
const getSuperAdminHeaders = () => {
    // In production, these would come from a secure login flow
    // For now, we'll use environment variables or prompt the user
    return {
        'x-super-admin-email': import.meta.env.VITE_SUPER_ADMIN_EMAIL || '',
        'x-super-admin-secret': import.meta.env.VITE_SUPER_ADMIN_SECRET || ''
    };
};

// Create authenticated request
const superAdminRequest = async (method: 'get' | 'post' | 'put' | 'delete', url: string, data?: any) => {
    const headers = getSuperAdminHeaders();

    // If no credentials, user needs to authenticate
    if (!headers['x-super-admin-email'] || !headers['x-super-admin-secret']) {
        throw new Error('Super admin credentials not configured');
    }

    const config = { headers };

    if (method === 'get') {
        return api.get(url, config);
    } else if (method === 'post') {
        return api.post(url, data, config);
    } else if (method === 'put') {
        return api.put(url, data, config);
    } else {
        return api.delete(url, config);
    }
};

// ==================== TYPES ====================

export interface SystemSetting {
    id: string;
    key: string;
    value: string;
    description?: string;
    updatedAt: string;
    updatedBy: string;
}

export interface BlockedIP {
    id: string;
    ip: string;
    reason?: string;
    blockedBy: string;
    createdAt: string;
}

export interface SystemStats {
    users: number;
    orders: number;
    products: number;
    node_env: string;
    memory_usage: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
}

export interface SystemHealth {
    database: { status: string; latency: number };
    cache: { status: string; connected: boolean };
    storage: { status: string };
    uptime: number;
}

// ==================== API FUNCTIONS ====================

export const superAdminApi = {
    // Authentication check
    login: async (): Promise<{ success: boolean; message: string }> => {
        const response = await superAdminRequest('post', '/super-admin/login');
        return response.data;
    },

    // System Health
    getHealth: async (): Promise<SystemHealth> => {
        const response = await superAdminRequest('get', '/super-admin/health');
        return response.data?.data || response.data;
    },

    getStats: async (): Promise<SystemStats> => {
        const response = await superAdminRequest('get', '/super-admin/stats');
        return response.data?.stats || response.data;
    },

    // System Settings
    getSettings: async (): Promise<SystemSetting[]> => {
        const response = await superAdminRequest('get', '/super-admin/settings');
        return response.data?.settings || [];
    },

    updateSetting: async (key: string, value: string, description?: string): Promise<SystemSetting> => {
        const response = await superAdminRequest('post', '/super-admin/settings', { key, value, description });
        return response.data?.setting;
    },

    // Blocked IPs
    getBlockedIPs: async (): Promise<BlockedIP[]> => {
        const response = await superAdminRequest('get', '/super-admin/ip/blocked');
        return response.data?.ips || [];
    },

    blockIP: async (ip: string, reason?: string): Promise<void> => {
        await superAdminRequest('post', '/super-admin/ip/block', { ip, reason });
    },

    unblockIP: async (ip: string): Promise<void> => {
        await superAdminRequest('delete', `/super-admin/ip/unblock/${ip}`);
    },

    // Users Management
    getUsers: async () => {
        const response = await superAdminRequest('get', '/super-admin/users');
        return response.data?.users || [];
    },

    updateUserRole: async (userId: string, role: string) => {
        const response = await superAdminRequest('post', '/super-admin/users/role', { userId, role });
        return response.data;
    },

    resetUserPassword: async (userId: string, newPassword: string) => {
        const response = await superAdminRequest('post', '/super-admin/users/reset-password', { userId, newPassword });
        return response.data;
    },

    forceLogoutUser: async (userId: string) => {
        const response = await superAdminRequest('post', '/super-admin/users/logout', { userId });
        return response.data;
    },

    // Logs
    getLogs: async (type: 'app' | 'error' = 'app'): Promise<string> => {
        const response = await superAdminRequest('get', `/super-admin/logs?type=${type}`);
        return response.data?.logs || '';
    },

    // Jobs
    triggerJob: async (jobName: string) => {
        const response = await superAdminRequest('post', '/super-admin/jobs/trigger', { jobName });
        return response.data;
    },

    getQueueStatus: async () => {
        const response = await superAdminRequest('get', '/super-admin/jobs/queue');
        return response.data?.queues || {};
    },

    // Webhooks
    getWebhookLogs: async () => {
        const response = await superAdminRequest('get', '/super-admin/webhooks');
        return response.data?.webhooks || [];
    },

    // Admin Activities
    getAdminActivities: async () => {
        const response = await superAdminRequest('get', '/super-admin/activities');
        return response.data?.activities || [];
    },

    // Emergency Actions
    forceVerifyPayment: async (reference: string) => {
        const response = await superAdminRequest('post', '/super-admin/payment/verify', { reference });
        return response.data;
    },

    // Env vars (safe ones only)
    getEnvVars: async () => {
        const response = await superAdminRequest('get', '/super-admin/env');
        return response.data?.env || {};
    }
};

export default superAdminApi;
