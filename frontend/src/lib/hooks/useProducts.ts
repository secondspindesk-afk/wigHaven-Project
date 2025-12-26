import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminProductApi, { ProductFormData, CategoryFormData, Variant } from '../api/products';
import publicProductApi from '../api/product';

// ==================== STOREFRONT PRODUCTS ====================

// Public Products Hook (for Shop page, Home page, etc.)
// Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
// This creates a real-time system without polling overhead
export function useProducts(params?: { search?: string; category?: string; sort?: string; page?: number; limit?: number; minPrice?: number; maxPrice?: number; inStock?: boolean }) {
    return useQuery({
        queryKey: ['products', params],
        queryFn: () => publicProductApi.getProducts(params),
        placeholderData: (previousData) => previousData,
        staleTime: 10 * 60 * 1000, // 10 minute safety window
        gcTime: 1000 * 60 * 60, // 1 hour garbage collection (memory cleanup)
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch if invalidated
    });
}

// ==================== ADMIN PRODUCTS ====================

// Admin Products Hook (for admin dashboard)
// Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
export function useAdminProducts(params?: { search?: string; category?: string; sort?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: ['admin', 'products', params],
        queryFn: () => adminProductApi.getProducts(params),
        placeholderData: (previousData) => previousData,
        staleTime: 10 * 60 * 1000, // 10 minute safety window
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchOnMount: true, // Refetch if invalidated
        refetchOnWindowFocus: false,
    });
}

// Get Single Product Hook (Admin)
// Cache FOREVER - WebSocket handles invalidation
export function useProduct(id: string | undefined) {
    return useQuery({
        queryKey: ['admin', 'products', id],
        queryFn: () => adminProductApi.getProduct(id!),
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 minute safety window
        gcTime: 60 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });
}

// Create Product Mutation with Optimistic Update
export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.createProduct,
        onMutate: async (_newProduct) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
            // Snapshot previous value for rollback
            const previousProducts = queryClient.getQueryData(['admin', 'products']);
            return { previousProducts };
        },
        onError: (_err, _newProduct, context) => {
            // Rollback on error
            if (context?.previousProducts) {
                queryClient.setQueryData(['admin', 'products'], context.previousProducts);
            }
        },
        onSuccess: () => {
            // Invalidate to get fresh data with real IDs
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });
}

// Update Product Mutation with Optimistic Update
export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
            adminProductApi.updateProduct(id, data),
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
            await queryClient.cancelQueries({ queryKey: ['admin', 'products', id] });

            // Snapshot previous values
            const previousProducts = queryClient.getQueryData(['admin', 'products']);
            const previousProduct = queryClient.getQueryData(['admin', 'products', id]);

            // Optimistically update single product
            if (previousProduct) {
                queryClient.setQueryData(['admin', 'products', id], (old: any) => ({
                    ...old,
                    ...data,
                }));
            }

            return { previousProducts, previousProduct };
        },
        onError: (_err, { id }, context) => {
            // Rollback on error
            if (context?.previousProducts) {
                queryClient.setQueryData(['admin', 'products'], context.previousProducts);
            }
            if (context?.previousProduct) {
                queryClient.setQueryData(['admin', 'products', id], context.previousProduct);
            }
        },
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'products', id] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product'] });
        }
    });
}

// Delete Product Mutation with Optimistic Update
export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.deleteProduct,
        onMutate: async (productId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });

            // Snapshot previous value
            const previousProducts = queryClient.getQueryData(['admin', 'products']);

            // Optimistically remove product from list
            queryClient.setQueryData(['admin', 'products'], (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.filter((p: any) => p.id !== productId),
                };
            });

            return { previousProducts };
        },
        onError: (_err, _productId, context) => {
            // Rollback on error
            if (context?.previousProducts) {
                queryClient.setQueryData(['admin', 'products'], context.previousProducts);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
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
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Also invalidate public products
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
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Also invalidate public products
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
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Also invalidate public products
        }
    });
}

// Bulk Delete Products Mutation with Optimistic Update
export function useBulkDeleteProducts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.bulkDeleteProducts,
        onMutate: async (productIds) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
            const previousProducts = queryClient.getQueryData(['admin', 'products']);

            // Optimistically remove products
            queryClient.setQueryData(['admin', 'products'], (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.filter((p: any) => !productIds.includes(p.id)),
                };
            });

            return { previousProducts };
        },
        onError: (_err, _ids, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['admin', 'products'], context.previousProducts);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });
}

// Bulk Update Status Mutation with Optimistic Update
export function useBulkUpdateProductStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
            adminProductApi.bulkUpdateStatus(ids, isActive),
        onMutate: async ({ ids, isActive }) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
            const previousProducts = queryClient.getQueryData(['admin', 'products']);

            // Optimistically update status
            queryClient.setQueryData(['admin', 'products'], (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((p: any) =>
                        ids.includes(p.id) ? { ...p, isActive } : p
                    ),
                };
            });

            return { previousProducts };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['admin', 'products'], context.previousProducts);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });
}

// Bulk Update Variants Mutation (Inventory) with Optimistic Update
export function useBulkUpdateVariants() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ variantIds, updates }: { variantIds: string[]; updates: Partial<Variant> }) =>
            adminProductApi.bulkUpdateVariants(variantIds, updates),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
            const previousProducts = queryClient.getQueryData(['admin', 'products']);
            return { previousProducts };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['admin', 'products'], context.previousProducts);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });
}

// ==================== ADMIN CATEGORIES ====================

// List Categories Hook (Admin)
// Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
export function useAdminCategories(params?: { isActive?: boolean; type?: string; search?: string }) {
    return useQuery({
        queryKey: ['admin', 'categories', params],
        queryFn: () => adminProductApi.getCategories(params),
        staleTime: 10 * 60 * 1000, // 10 minute safety window
        gcTime: 60 * 60 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });
}

// Legacy alias for backward compatibility (admin pages importing useCategories from this file)
export { useAdminCategories as useCategories };

// Create Category Mutation with Optimistic Update
export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminProductApi.createCategory,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'categories'] });
            const previousCategories = queryClient.getQueryData(['admin', 'categories']);
            return { previousCategories };
        },
        onError: (_err, _newCategory, context) => {
            if (context?.previousCategories) {
                queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}

// Update Category Mutation with Optimistic Update
export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormData> }) =>
            adminProductApi.updateCategory(id, data),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'categories'] });
            const previousCategories = queryClient.getQueryData(['admin', 'categories']);
            return { previousCategories };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousCategories) {
                queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}

// Delete Category Mutation with Optimistic Update
export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, transferToId }: { id: string; transferToId?: string }) =>
            adminProductApi.deleteCategory(id, transferToId),
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['admin', 'categories'] });
            const previousCategories = queryClient.getQueryData(['admin', 'categories']);

            // Optimistically remove category
            queryClient.setQueryData(['admin', 'categories'], (old: any) => {
                if (!old) return old;
                return old.filter((c: any) => c.id !== id);
            });

            return { previousCategories };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousCategories) {
                queryClient.setQueryData(['admin', 'categories'], context.previousCategories);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}

