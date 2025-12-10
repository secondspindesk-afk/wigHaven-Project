import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminProductApi, { ProductFormData, CategoryFormData, Variant } from '../api/products';
import publicProductApi from '../api/product';

// ==================== STOREFRONT PRODUCTS ====================

// Public Products Hook (for Shop page, Home page, etc.)
// Cache aggressively - products don't change frequently
export function useProducts(params?: { search?: string; category?: string; sort?: string; page?: number; limit?: number; minPrice?: number; maxPrice?: number; inStock?: boolean }) {
    return useQuery({
        queryKey: ['products', params],
        queryFn: () => publicProductApi.getProducts(params),
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60 * 10, // 10 minutes - products don't change often
        gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
        refetchOnWindowFocus: false, // Don't refetch on tab focus
    });
}

// ==================== ADMIN PRODUCTS ====================

// Admin Products Hook (for admin dashboard)
export function useAdminProducts(params?: { search?: string; category?: string; sort?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: ['admin', 'products', params],
        queryFn: () => adminProductApi.getProducts(params),
        placeholderData: (previousData) => previousData,
        staleTime: 0
    });
}

// Get Single Product Hook (Admin)
export function useProduct(id: string | undefined) {
    return useQuery({
        queryKey: ['admin', 'products', id],
        queryFn: () => adminProductApi.getProduct(id!),
        enabled: !!id,
        staleTime: 0
    });
}

// Create Product Mutation
export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Update Product Mutation
export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
            adminProductApi.updateProduct(id, data),
        onSuccess: (data: { id: string }) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'products', data.id] });
        }
    });
}

// Delete Product Mutation
export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Delete Variant Mutation
export function useDeleteVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.deleteVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Duplicate Product Mutation
export function useDuplicateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.duplicateProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Bulk Upload Products Mutation
export function useBulkUploadProducts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.bulkUpload,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Bulk Delete Products Mutation
export function useBulkDeleteProducts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.bulkDeleteProducts,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Bulk Update Status Mutation
export function useBulkUpdateProductStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
            adminProductApi.bulkUpdateStatus(ids, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// Bulk Update Variants Mutation (Inventory)
export function useBulkUpdateVariants() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ variantIds, updates }: { variantIds: string[]; updates: Partial<Variant> }) =>
            adminProductApi.bulkUpdateVariants(variantIds, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }
    });
}

// ==================== ADMIN CATEGORIES ====================

// List Categories Hook (Admin)
export function useAdminCategories(params?: { isActive?: boolean; type?: string; search?: string }) {
    return useQuery({
        queryKey: ['admin', 'categories', params],
        queryFn: () => adminProductApi.getCategories(params),
        staleTime: 0
    });
}

// Legacy alias for backward compatibility (admin pages importing useCategories from this file)
export { useAdminCategories as useCategories };

// Create Category Mutation
export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
        }
    });
}

// Update Category Mutation
export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormData> }) =>
            adminProductApi.updateCategory(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
        }
    });
}

// Delete Category Mutation
export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, transferToId }: { id: string; transferToId?: string }) =>
            adminProductApi.deleteCategory(id, transferToId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
        }
    });
}

