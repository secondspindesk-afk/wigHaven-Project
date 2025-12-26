import { getPrisma } from '../config/database.js';
import smartCache from '../utils/smartCache.js';
import logger from '../utils/logger.js';

/**
 * Admin Search Service
 * Unified search across all admin-relevant entities
 * 
 * OPTIMIZATIONS:
 * - 60-second cache for repeated searches (reduces 8 parallel queries to 0)
 * - Results are cached per normalized query
 * - Invalidated instantly on any data change via adminBroadcast
 * 
 * SECURITY: All searches are sanitized and use Prisma's built-in query safety.
 * No raw SQL is used to prevent injection attacks.
 */

/**
 * Unified search across all entities (CACHED)
 * @param {string} query - Search query (minimum 2 characters)
 * @param {Object} options - Search options
 * @param {number} options.limit - Results per category (default: 5, max: 20)
 * @returns {Promise<Object>} Categorized search results
 */
export const unifiedSearch = async (query, options = {}) => {
    const limit = Math.min(options.limit || 5, 20);

    // Sanitize query - trim whitespace, ensure minimum length
    const searchTerm = query?.trim()?.toLowerCase();
    if (!searchTerm || searchTerm.length < 2) {
        throw new Error('Search query must be at least 2 characters');
    }

    // Cache key: normalize search for consistency
    const cacheKey = `search:${searchTerm}:${limit}`;

    return smartCache.getOrFetch(
        cacheKey,
        () => executeSearch(searchTerm, limit),
        { type: 'search', swr: true }
    );
};

/**
 * Execute the actual search (uncached)
 */
const executeSearch = async (searchTerm, limit) => {
    const prisma = getPrisma();

    try {
        // Execute all searches in parallel for performance
        const [
            products,
            orders,
            users,
            reviews,
            categories,
            discounts,
            banners,
            supportTickets
        ] = await Promise.allSettled([
            searchProducts(prisma, searchTerm, limit),
            searchOrders(prisma, searchTerm, limit),
            searchUsers(prisma, searchTerm, limit),
            searchReviews(prisma, searchTerm, limit),
            searchCategories(prisma, searchTerm, limit),
            searchDiscounts(prisma, searchTerm, limit),
            searchBanners(prisma, searchTerm, limit),
            searchSupportTickets(prisma, searchTerm, limit)
        ]);

        // Extract results, defaulting to empty arrays on failure
        const results = {
            products: extractResults(products),
            orders: extractResults(orders),
            users: extractResults(users),
            reviews: extractResults(reviews),
            categories: extractResults(categories),
            discounts: extractResults(discounts),
            banners: extractResults(banners),
            support: extractResults(supportTickets)
        };

        // Calculate totals
        const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

        return {
            query: searchTerm,
            results,
            total,
            limit
        };
    } catch (error) {
        logger.error('Admin unified search error:', error);
        throw error;
    }
};

/**
 * Extract results from Promise.allSettled result
 */
const extractResults = (result) => {
    if (result.status === 'fulfilled') {
        return result.value;
    }
    logger.warn('Search category failed:', result.reason?.message);
    return [];
};

/**
 * Search Products
 */
const searchProducts = async (prisma, query, limit) => {
    const products = await prisma.product.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { variants: { some: { sku: { contains: query, mode: 'insensitive' } } } }
            ]
        },
        select: {
            id: true,
            name: true,
            basePrice: true,
            isActive: true,
            images: true,
            category: { select: { name: true } }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return products.map(p => ({
        id: p.id,
        type: 'product',
        title: p.name,
        subtitle: p.category?.name || 'Uncategorized',
        meta: `₵${Number(p.basePrice).toFixed(2)}`,
        image: p.images?.[0] || null,
        status: p.isActive ? 'active' : 'inactive',
        url: `/admin/products/${p.id}/edit`
    }));
};

/**
 * Search Orders
 */
const searchOrders = async (prisma, query, limit) => {
    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { orderNumber: { contains: query, mode: 'insensitive' } },
                { customerEmail: { contains: query, mode: 'insensitive' } },
                { customerPhone: { contains: query } }
            ]
        },
        select: {
            id: true,
            orderNumber: true,
            customerEmail: true,
            total: true,
            status: true,
            paymentStatus: true,
            createdAt: true
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return orders.map(o => ({
        id: o.id,
        type: 'order',
        title: o.orderNumber,
        subtitle: o.customerEmail,
        meta: `₵${Number(o.total).toFixed(2)}`,
        status: o.status,
        paymentStatus: o.paymentStatus,
        url: `/admin/orders/${o.orderNumber}`
    }));
};

/**
 * Search Users
 */
const searchUsers = async (prisma, query, limit) => {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } }
            ]
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            _count: { select: { orders: true } }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return users.map(u => ({
        id: u.id,
        type: 'user',
        title: `${u.firstName} ${u.lastName}`.trim() || u.email,
        subtitle: u.email,
        meta: `${u._count.orders} orders`,
        role: u.role,
        status: u.isActive ? 'active' : 'inactive',
        url: `/admin/users/${u.id}`
    }));
};

/**
 * Search Reviews
 */
const searchReviews = async (prisma, query, limit) => {
    const reviews = await prisma.review.findMany({
        where: {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
                { authorName: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            title: true,
            authorName: true,
            rating: true,
            isApproved: true,
            product: { select: { name: true } }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return reviews.map(r => ({
        id: r.id,
        type: 'review',
        title: r.title,
        subtitle: `by ${r.authorName} on ${r.product?.name || 'Unknown Product'}`,
        meta: `${r.rating}★`,
        status: r.isApproved ? 'approved' : 'pending',
        url: `/admin/reviews?highlight=${r.id}`
    }));
};

/**
 * Search Categories
 */
const searchCategories = async (prisma, query, limit) => {
    const categories = await prisma.category.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            type: true,
            image: true,
            _count: { select: { products: true } }
        },
        take: limit,
        orderBy: { name: 'asc' }
    });

    return categories.map(c => ({
        id: c.id,
        type: 'category',
        title: c.name,
        subtitle: c.type,
        meta: `${c._count.products} products`,
        image: c.image,
        status: c.isActive ? 'active' : 'inactive',
        url: `/admin/categories?edit=${c.id}`
    }));
};

/**
 * Search Discount Codes
 */
const searchDiscounts = async (prisma, query, limit) => {
    const discounts = await prisma.discountCode.findMany({
        where: {
            OR: [
                { code: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            code: true,
            type: true,
            value: true,
            isActive: true,
            usedCount: true,
            maxUses: true,
            expiresAt: true
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return discounts.map(d => ({
        id: d.id,
        type: 'discount',
        title: d.code,
        subtitle: d.type === 'percentage' ? `${Number(d.value)}% off` : `₵${Number(d.value)} off`,
        meta: d.maxUses ? `${d.usedCount}/${d.maxUses} uses` : `${d.usedCount} uses`,
        status: d.isActive && new Date(d.expiresAt) > new Date() ? 'active' : 'expired',
        url: `/admin/discounts?edit=${d.id}`
    }));
};

/**
 * Search Promotional Banners
 */
const searchBanners = async (prisma, query, limit) => {
    const banners = await prisma.promotionalBanner.findMany({
        where: {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            isActive: true,
            startDate: true,
            endDate: true
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    return banners.map(b => {
        const isScheduled = new Date(b.startDate) > now;
        const isExpired = new Date(b.endDate) < now;
        let status = 'active';
        if (!b.isActive) status = 'inactive';
        else if (isExpired) status = 'expired';
        else if (isScheduled) status = 'scheduled';

        return {
            id: b.id,
            type: 'banner',
            title: b.title,
            subtitle: b.description?.slice(0, 50) || 'No description',
            image: b.imageUrl,
            status,
            url: `/admin/banners?edit=${b.id}`
        };
    });
};

/**
 * Search Support Tickets
 */
const searchSupportTickets = async (prisma, query, limit) => {
    const tickets = await prisma.supportTicket.findMany({
        where: {
            OR: [
                { subject: { contains: query, mode: 'insensitive' } },
                { user: { email: { contains: query, mode: 'insensitive' } } },
                { user: { firstName: { contains: query, mode: 'insensitive' } } },
                { user: { lastName: { contains: query, mode: 'insensitive' } } }
            ]
        },
        select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            user: { select: { email: true, firstName: true, lastName: true } }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return tickets.map(t => ({
        id: t.id,
        type: 'support',
        title: t.subject,
        subtitle: t.user?.email || 'Unknown User',
        meta: t.priority,
        status: t.status,
        url: `/admin/support?ticket=${t.id}`
    }));
};

export default {
    unifiedSearch
};
