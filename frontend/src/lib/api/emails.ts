import api from './axios';

// ==================== TYPES ====================

export interface EmailLog {
    id: string;
    type: string;
    toEmail: string;
    subject: string;
    status: 'sent' | 'failed' | 'pending';
    error?: string;
    createdAt: string;
    updatedAt: string;
}

export interface EmailStats {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    queue: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
}

export interface EmailFilter {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    days?: number;
}

export interface EmailResponse {
    logs: EmailLog[];
    pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
    };
}

// Helper to extract data
function extractData<T>(response: { data: { success: boolean; data: T } | T }): T {
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        return (outerData as { success: boolean; data: T }).data;
    }
    return outerData as T;
}

// ==================== API FUNCTIONS ====================

export const emailApi = {
    // Get email logs
    getLogs: async (params?: EmailFilter): Promise<EmailResponse> => {
        const response = await api.get('/admin/emails/logs', { params });
        return {
            logs: response.data.data,
            pagination: response.data.pagination
        };
    },

    // Get email stats
    getStats: async (): Promise<EmailStats> => {
        const response = await api.get('/admin/emails/stats');
        return extractData(response);
    },

    // Retry failed email
    retryFailed: async (emailLogId?: string): Promise<{ requeuedCount: number }> => {
        const response = await api.post('/admin/emails/retry-failed', { email_log_id: emailLogId });
        return extractData(response);
    }
};

export default emailApi;
