import api from './axios';

// ==================== TYPES ====================

export interface Variant {
    id?: string;
    sku: string;
    price: number;
    stock: number;
    length?: string | null;
    color?: string | null;
    texture?: string | null;
    size?: string | null;
    images?: string[];
    isActive: boolean;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    categoryId: string;
    category?: {
        id: string;
        name: string;
        slug: string;
    };
    /** @deprecated Use variants[0].images instead - all images stored on variants */
    images: string[];
    isActive: boolean;
    isFeatured: boolean;
    variantCount: number;
    totalStock: number;
    createdAt: string;
    updatedAt: string;
    variants?: Variant[];
}

export interface ProductFormData {
    name: string;
    description: string;
    basePrice: number;
    categoryId: string;
    isActive: boolean;
    isFeatured: boolean;
    images: string[];
    variants: Variant[];
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image: string | null;
    isActive: boolean;
    isFeatured: boolean;
    type: 'standard' | 'collection' | 'landing';
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CategoryFormData {
    name: string;
    description?: string;
    image: string | null;
    isActive: boolean;
    isFeatured: boolean;
    type: 'standard' | 'collection' | 'landing';
}

export interface UploadResponse {
    fileId: string;
    url: string;
    thumbnailUrl: string;
    name: string;
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

export const productApi = {
    // --- PRODUCTS ---

    // List Products (Admin)
    getProducts: async (params?: {
        search?: string;
        category?: string;
        sort?: string;
        page?: number;
        limit?: number
    }): Promise<{ products: Product[]; total: number; pages: number }> => {
        const response = await api.get('/admin/products', { params });
        return extractData(response);
    },

    // Get Single Product
    getProduct: async (id: string): Promise<Product> => {
        const response = await api.get(`/admin/products/${id}`);
        return extractData(response);
    },

    // Create Product
    createProduct: async (data: ProductFormData): Promise<Product> => {
        const response = await api.post('/admin/products', data);
        return extractData(response);
    },

    // Update Product
    updateProduct: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
        const response = await api.patch(`/admin/products/${id}`, data);
        return extractData(response);
    },

    // Delete Product (hard delete - images moved to trash)
    deleteProduct: async (id: string): Promise<{ success: boolean; imagesMovedToTrash: number }> => {
        const response = await api.delete(`/admin/products/${id}`);
        return extractData(response);
    },

    // Delete Variant (hard delete - images moved to trash)
    deleteVariant: async (id: string): Promise<{ success: boolean; imagesMovedToTrash: number }> => {
        const response = await api.delete(`/admin/variants/${id}`);
        return extractData(response);
    },

    // Duplicate Product
    duplicateProduct: async (id: string): Promise<Product> => {
        const response = await api.post(`/admin/products/${id}/duplicate`);
        return extractData(response);
    },

    // Bulk Upload
    bulkUpload: async (file: File): Promise<{ processed: number; errors: any[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/admin/products/bulk-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return extractData(response);
    },

    // Bulk Delete Products
    bulkDeleteProducts: async (ids: string[]): Promise<{ success: number; failed: number }> => {
        const response = await api.delete('/admin/products/bulk', { data: { ids } });
        return extractData(response);
    },

    // Bulk Update Status
    bulkUpdateStatus: async (ids: string[], isActive: boolean): Promise<{ count: number }> => {
        const response = await api.patch('/admin/products/bulk-status', { ids, isActive });
        return extractData(response);
    },

    // Bulk Update Variants (Inventory)
    bulkUpdateVariants: async (variantIds: string[], updates: Partial<Variant>): Promise<{ count: number }> => {
        const response = await api.patch('/admin/inventory/bulk-update', { variantIds, updates });
        return extractData(response);
    },

    // --- CATEGORIES ---

    // List Categories (Admin)
    getCategories: async (params?: { isActive?: boolean; type?: string; search?: string }): Promise<Category[]> => {
        const response = await api.get('/admin/categories', { params });
        return extractData(response);
    },

    // Create Category
    createCategory: async (data: CategoryFormData): Promise<Category> => {
        const response = await api.post('/admin/categories', data);
        return extractData(response);
    },

    // Update Category
    updateCategory: async (id: string, data: Partial<CategoryFormData>): Promise<Category> => {
        const response = await api.patch(`/admin/categories/${id}`, data);
        return extractData(response);
    },

    // Delete Category
    deleteCategory: async (id: string, transferToId?: string): Promise<void> => {
        await api.delete(`/admin/categories/${id}`, { data: { transferToId } });
    },

    // --- UPLOAD ---
    // NOTE: For full upload functionality with duplicate detection,
    // use the dedicated upload.ts module instead.
    // These are kept for backward compatibility.

    /** @deprecated Use uploadApi from './upload.ts' for duplicate detection */
    uploadImage: async (file: File, type: 'product' | 'category' | 'variant' = 'variant'): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/upload?type=${type}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return extractData(response);
    },

    /** @deprecated Use uploadApi.deleteImage from './upload.ts' */
    deleteImage: async (url: string): Promise<void> => {
        await api.delete('/upload', { data: { url } });
    }
};

export default productApi;
