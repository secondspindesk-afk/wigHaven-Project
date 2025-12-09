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

// Helper to extract data
function extractData<T>(response: { data: { success: boolean; data: T } | T }): T {
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        return (outerData as { success: boolean; data: T }).data;
    }
    return outerData as T;
}

// ==================== API FUNCTIONS ====================

export const bannerApi = {
    // Get all banners (Admin)
    getAllBanners: async (): Promise<Banner[]> => {
        const response = await api.get('/admin/banners');
        return extractData(response);
    },

    // Get single banner by ID (Admin)
    getBanner: async (id: string): Promise<Banner> => {
        const response = await api.get(`/admin/banners/${id}`);
        return extractData(response);
    },

    // Create banner
    createBanner: async (data: BannerFormData): Promise<Banner> => {
        const response = await api.post('/admin/banners', data);
        return extractData(response);
    },

    // Update banner
    updateBanner: async (id: string, data: Partial<BannerFormData>): Promise<Banner> => {
        const response = await api.put(`/admin/banners/${id}`, data);
        return extractData(response);
    },

    // Delete banner
    deleteBanner: async (id: string): Promise<void> => {
        await api.delete(`/admin/banners/${id}`);
    }
};

export default bannerApi;
