import api from './axios';

// ==================== TYPES ====================

export interface Discount {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    startsAt: string;
    expiresAt: string;
    maxUses: number | null;
    usesPerCustomer: number;
    minimumPurchase: number | null;
    isActive: boolean;
    usedCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface DiscountFormData {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    startsAt: string;
    expiresAt: string;
    maxUses?: number;
    usesPerCustomer?: number;
    minimumPurchase?: number;
    isActive: boolean;
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

export const discountApi = {
    // Get all discounts (Admin)
    getAllDiscounts: async (): Promise<Discount[]> => {
        const response = await api.get('/admin/discounts');
        return extractData(response);
    },

    // Create discount
    createDiscount: async (data: DiscountFormData): Promise<Discount> => {
        const response = await api.post('/admin/discounts', data);
        return extractData(response);
    },

    // Get discount by ID
    getDiscount: async (id: string): Promise<Discount> => {
        const response = await api.get(`/admin/discounts/${id}`);
        return extractData(response);
    },

    // Update discount
    updateDiscount: async (id: string, data: Partial<DiscountFormData>): Promise<Discount> => {
        const response = await api.put(`/admin/discounts/${id}`, data);
        return extractData(response);
    },

    // Delete discount
    deleteDiscount: async (id: string): Promise<void> => {
        await api.delete(`/admin/discounts/${id}`);
    },

    // Validate discount (Public/Protected)
    validateDiscount: async (code: string, cartTotal: number): Promise<{ isValid: boolean; discountAmount: number; finalTotal: number }> => {
        const response = await api.post('/discounts/validate', { code, cartTotal });
        return extractData(response);
    }
};

export default discountApi;
