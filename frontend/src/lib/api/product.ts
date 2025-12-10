import axios from './axios';
import type { Product, Review } from '@/lib/types/product';

export interface CreateReviewData {
    productId: string;
    rating: number;
    title: string;
    content: string;
    images?: string[]; // Changed from File[] to string[] (URLs)
}

const productApi = {
    // Public products list (storefront)
    getProducts: async (params?: {
        category?: string;
        search?: string;
        page?: number;
        limit?: number;
        sort?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
    }): Promise<{ data: Product[]; pagination: { page: number; pages: number; total: number } }> => {
        const response = await axios.get<{
            success: boolean;
            data: { products: Product[]; total: number; pages: number; page: number }
        }>('/products', { params });

        // Transform backend response: data.data.products -> data
        const { products, total, pages, page } = response.data.data;
        return {
            data: products,
            pagination: { page, pages, total }
        };
    },

    // Public categories (storefront)
    // NEVER returns undefined - always returns at least an empty array
    getCategories: async (): Promise<{ id: string; label: string; count: number; image?: string | null }[]> => {
        try {
            const response = await axios.get<{ success: boolean; data: { id: string; label: string; count: number; image?: string | null }[] }>('/products/categories');
            return response.data?.data ?? [];
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            return []; // Safe fallback
        }
    },

    getProduct: async (id: string): Promise<Product> => {
        const response = await axios.get<{ success: boolean; data: Product }>(`/products/${id}`);
        return response.data.data;
    },

    getRelatedProducts: async (categoryId: string): Promise<Product[]> => {
        const response = await axios.get<{
            success: boolean;
            data: { products: Product[]; total: number; pages: number; page: number }
        }>(`/products?category=${categoryId}&limit=6`);
        return response.data.data.products;
    },

    getReviews: async (productId: string, page = 1): Promise<{ reviews: Review[]; total: number; pages: number; stats?: { average: number; count: number } }> => {
        const response = await axios.get<{ success: boolean; data: Review[]; pagination: { total: number; pages: number }; stats?: { average: number; count: number } }>(`/reviews/product/${productId}?page=${page}`);
        return {
            reviews: response.data.data,
            total: response.data.pagination.total,
            pages: response.data.pagination.pages,
            stats: response.data.stats
        };
    },

    createReview: async (data: CreateReviewData): Promise<Review> => {
        // Images are now uploaded separately and passed as URLs (strings)
        const response = await axios.post<{ success: boolean; data: Review }>('/reviews', data);
        return response.data.data;
    },

    markReviewHelpful: async (reviewId: string): Promise<void> => {
        await axios.post(`/reviews/${reviewId}/helpful`);
    },

    addToWishlist: async (productId: string): Promise<void> => {
        await axios.post('/wishlist', { productId });
    },

    removeFromWishlist: async (productId: string): Promise<void> => {
        await axios.delete(`/wishlist/${productId}`);
    },

    subscribeToRestock: async (variantId: string, email: string): Promise<void> => {
        await axios.post('/stock/notify', { variantId, email });
    }
};

export default productApi;
