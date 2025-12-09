import api from './axios';

// ==================== TYPES ====================

export interface MediaFile {
    id: string;
    url: string;
    thumbnailUrl?: string;
    fileName: string;
    fileType?: string;
    type: string; // variant, category, banner, review
    size: number;
    width?: number;
    height?: number;
    folder?: string;
    uploadedBy?: string;
    usedBy?: string;
    usageType?: string;
    entityName?: string; // Product name, category name, etc.
    createdAt?: string;
    updatedAt?: string;
}

export interface MediaFilter {
    folder?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface MediaResponse {
    files: MediaFile[];
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

export const mediaApi = {
    // List media
    listMedia: async (params?: MediaFilter): Promise<MediaResponse> => {
        const queryParams: any = { ...params };
        if (queryParams.folder) {
            queryParams.type = queryParams.folder;
            delete queryParams.folder;
        }
        const response = await api.get('/admin/media', { params: queryParams });
        return {
            files: response.data.data,
            pagination: response.data.pagination
        };
    },

    // Soft delete
    softDelete: async (id: string): Promise<void> => {
        await api.delete(`/admin/media/${id}/soft`);
    },

    // Hard delete
    hardDelete: async (id: string): Promise<void> => {
        await api.delete(`/admin/media/${id}/hard`);
    },

    // Batch delete
    batchDelete: async (ids: string[]): Promise<void> => {
        await api.delete('/admin/media/batch', { data: { ids } });
    },

    // Sync media
    syncMedia: async (): Promise<{ synced: number }> => {
        const response = await api.post('/admin/media/sync');
        return extractData(response);
    }
};

export default mediaApi;
