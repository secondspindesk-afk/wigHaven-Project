// Variant Attributes
export interface VariantAttributes {
    color: string | null;
    length: string | null;
    texture: string | null;
    size: string | null;
}

// Product Variant
export interface Variant {
    id: string;
    productId: string;
    sku: string;
    price: number;
    stock: number;
    images: string[];
    color: string | null;
    length: string | null;
    texture: string | null;
    size: string | null;
    isActive: boolean;
}

// Product Stats
export interface ProductStats {
    total_variants: number;
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
}

// Product Category (from API)
export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
}

// Product
export interface Product {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    category: ProductCategory; // Category object from API
    images: string[];
    isActive: boolean;
    isFeatured: boolean;
    createdAt: string;
    updatedAt: string;
    variants: Variant[];
    stats: ProductStats;
}

// Category
export interface Category {
    id: string; // Slug
    label: string;
    count: number;
    image?: string; // Optional category image
}

// Product List Filters
export interface ProductFilters {
    page?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
    inStock?: boolean;
    search?: string;
}

// Pagination
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

// API Responses
export interface ProductListResponse {
    success: boolean;
    data: Product[];
    pagination: Pagination;
}

export interface ProductResponse {
    success: boolean;
    data: Product;
}

export interface CategoriesResponse {
    success: boolean;
    data: Category[];
}

// Review (for product detail page)
export interface Review {
    id: string;
    productId: string;
    userId: string | null;
    rating: number;
    title: string;
    content: string;
    images: string[];
    authorName: string;
    isVerified: boolean;
    isApproved: boolean;
    helpfulCount: number;
    createdAt: string;
}

export interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        [key: number]: number; // 1-5 stars
    };
}

export interface ProductReviewsResponse {
    success: boolean;
    data: Review[];
    stats: ReviewStats;
    pagination: Pagination;
}

/**
 * SMART VARIANT SELECTION - Universal helper
 * 
 * Intelligently selects the best default variant for display/cart
 * CRITICAL: Automatically skips out-of-stock variants
 * 
 * Priority Logic:
 * 1. Active variants with stock > 0
 * 2. Sort by lowest price (best value first)
 * 3. If variant[0] is out of stock, auto-select next available
 * 4. Fallback to first variant only if ALL are out of stock
 * 
 * Example: If variant[0] has stock=0, automatically shows variant[1] or next in stock
 */
export function getDefaultVariant(variants: Variant[]): Variant | null {
    if (!variants || variants.length === 0) return null;

    // 1. Priority: Main Variant (Index 0)
    // If it's active and in stock, ALWAYS show it first
    const mainVariant = variants[0];
    if (mainVariant && mainVariant.isActive && mainVariant.stock > 0) {
        return mainVariant;
    }

    // 2. Fallback: Next Available Variant
    // Find the first variant that is active and in stock (preserve order, NO price sorting)
    const nextAvailable = variants.find(v => v.isActive && v.stock > 0);

    if (nextAvailable) {
        return nextAvailable;
    }

    // 3. All out of stock: Return main variant for display
    return mainVariant;
}
