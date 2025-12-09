import api from './axios';

// ==================== TYPES ====================
export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'customer' | 'admin';
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    order_count: number;
    total_spent: number;
}

export interface UsersFilters {
    page?: number;
    limit?: number;
    search?: string;
}

// Helper to extract data from API response wrapper
function extractData<T>(response: { data: { success: boolean; data: T } | T }): T {
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        return (outerData as { success: boolean; data: T }).data;
    }
    return outerData as T;
}

// ==================== API FUNCTIONS ====================
export const usersApi = {
    // Get all users (Admin)
    getUsers: async (filters?: UsersFilters): Promise<{ users: AdminUser[]; pagination: any }> => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.search) params.append('search', filters.search);

        const response = await api.get(`/admin/users?${params.toString()}`);
        return {
            users: response.data.data,
            pagination: response.data.pagination
        };
    },

    // Ban user
    banUser: async (userId: string): Promise<AdminUser> => {
        const response = await api.patch(`/admin/users/${userId}/ban`);
        return extractData(response);
    },

    // Unban user
    unbanUser: async (userId: string): Promise<AdminUser> => {
        const response = await api.patch(`/admin/users/${userId}/unban`);
        return extractData(response);
    },

    // Get user details
    getUser: async (userId: string): Promise<AdminUser & { addresses: any[]; orders: any[] }> => {
        const response = await api.get(`/admin/users/${userId}`);
        return extractData(response);
    },

    // Update user role (Super Admin)
    updateUserRole: async (userId: string, role: string): Promise<AdminUser> => {
        const response = await api.post('/super-admin/users/role', { userId, role });
        return extractData(response);
    },

    // Update user details (Super Admin)
    updateUserDetails: async (userId: string, data: Partial<AdminUser>): Promise<AdminUser> => {
        const response = await api.put(`/super-admin/users/${userId}`, data);
        return extractData(response);
    }
};

export default usersApi;
