import api from './axios';

// ==================== TYPES ====================

export interface Banner {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    startDate: string;
    endDate: string;
    priority: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BannerFormData {
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    startDate: string;
    endDate: string;
    priority: number;
    notifyUsers?: boolean;
    isActive?: boolean;
}

// Helper to safely extract data with fallback
function extractData<T>(response: { data: { success: boolean; data: T } | T } | undefined | null, fallback: T): T {
    if (!response || !response.data) {
        return fallback;
    }
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        const result = (outerData as { success: boolean; data: T }).data;
        return result ?? fallback;
    }
    return (outerData as T) ?? fallback;
}

// ==================== API FUNCTIONS ====================

export const bannerApi = {
    // Get active banners (Public - no auth required)
    getActiveBanners: async (): Promise<Banner[]> => {
        try {
            const response = await api.get('/banners');
            return extractData(response, [] as Banner[]);
        } catch (error) {
            console.error('Failed to fetch active banners:', error);
            return [];
        }
    },

    // Get all banners (Admin)
    getAllBanners: async (): Promise<Banner[]> => {
        try {
            const response = await api.get('/admin/banners');
            return extractData(response, [] as Banner[]);
        } catch (error) {
            console.error('Failed to fetch all banners:', error);
            return [];
        }
    },

    // Get single banner by ID (Admin)
    getBanner: async (id: string): Promise<Banner> => {
        const response = await api.get(`/admin/banners/${id}`);
        return extractData(response, {} as Banner);
    },

    // Create banner
    createBanner: async (data: BannerFormData): Promise<Banner> => {
        const response = await api.post('/admin/banners', data);
        return extractData(response, {} as Banner);
    },

    // Update banner
    updateBanner: async (id: string, data: Partial<BannerFormData>): Promise<Banner> => {
        const response = await api.put(`/admin/banners/${id}`, data);
        return extractData(response, {} as Banner);
    },

    // Delete banner
    deleteBanner: async (id: string): Promise<void> => {
        await api.delete(`/admin/banners/${id}`);
    }
};

export default bannerApi;
