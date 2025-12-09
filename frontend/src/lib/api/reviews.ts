import api from './axios';

// ==================== TYPES ====================
export interface AdminReview {
    id: string;
    rating: number;
    title: string;
    content: string;
    status: ReviewStatus;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        reviewStatus?: 'standard' | 'trusted' | 'blocked';
    };
    authorName?: string;
    product: {
        id: string;
        name: string;
        images?: string[];
    };
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewFilters {
    page?: number;
    limit?: number;
    status?: ReviewStatus;
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
export const reviewsApi = {
    // Get all reviews (Admin)
    getReviews: async (filters?: ReviewFilters): Promise<{ reviews: AdminReview[]; pagination: any }> => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.status) params.append('status', filters.status);

        const response = await api.get(`/reviews/admin/all?${params.toString()}`);
        return {
            reviews: response.data.data || response.data.reviews || [],
            pagination: response.data.pagination || { page: 1, pages: 1, total: 0, limit: 20 }
        };
    },

    // Approve review
    approveReview: async (reviewId: string): Promise<AdminReview> => {
        const response = await api.patch(`/reviews/${reviewId}/approve`);
        return extractData(response);
    },

    // Reject review (update status)
    rejectReview: async (reviewId: string): Promise<AdminReview> => {
        const response = await api.patch(`/reviews/${reviewId}/reject`);
        return extractData(response);
    },

    // Update review content
    updateReview: async (reviewId: string, data: { title?: string; content?: string }): Promise<AdminReview> => {
        const response = await api.patch(`/reviews/${reviewId}`, data);
        return extractData(response);
    },

    // Delete review
    deleteReview: async (reviewId: string): Promise<void> => {
        await api.delete(`/reviews/${reviewId}`);
    },

    // Bulk update reviews
    bulkUpdateReviews: async (ids: string[], action: 'approve' | 'reject' | 'delete'): Promise<{ count: number; action: string }> => {
        const response = await api.post('/reviews/admin/bulk-update', { ids, action });
        return extractData(response);
    },

    // Update user review status
    updateUserReviewStatus: async (userId: string, status: 'standard' | 'trusted' | 'blocked'): Promise<any> => {
        const response = await api.post('/reviews/admin/user-status', { userId, status });
        return extractData(response);
    }
};

export default reviewsApi;
