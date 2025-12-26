import { getPrisma } from '../config/database.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';
import smartCache from '../utils/smartCache.js';
import adminBroadcast from '../utils/adminBroadcast.js';

/**
 * Invalidate banner cache
 * @deprecated Use adminBroadcast.notifyBannersChanged() instead
 */
const invalidateBannerCache = async () => {
    await adminBroadcast.notifyBannersChanged();
};

/**
 * Create promotional banner
 */
export const createBanner = async (bannerData, createdBy) => {
    const prisma = getPrisma();

    const banner = await prisma.promotionalBanner.create({
        data: {
            ...bannerData,
            createdBy
        }
    });

    logger.info(`Banner created: ${banner.id} by user ${createdBy}`);

    // Invalidate cache after creation
    await invalidateBannerCache();

    // Optionally notify all users about the sale (if requested)
    if (bannerData.notifyUsers) {
        await notificationService.notifyPromotionalCampaign(
            bannerData.title,
            bannerData.description || 'Check out our latest sale!',
            bannerData.linkUrl
        );
    }

    return banner;
};

/**
 * Fetch active banners from database (internal helper)
 */
const fetchActiveBannersFromDB = async () => {
    const prisma = getPrisma();
    const now = new Date();

    return await prisma.promotionalBanner.findMany({
        where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now }
        },
        orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
        ],
        select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            linkUrl: true,
            priority: true
        }
    });
};

/**
 * Get active banners (for frontend display)
 * 
 * SMART CACHED: 5 min TTL, request deduplication, SWR
 */
export const getActiveBanners = async () => {
    return smartCache.getOrFetch(
        smartCache.keys.banners(),
        fetchActiveBannersFromDB,
        { type: 'banners', swr: true }
    );
};

/**
 * Get all banners (admin)
 */
export const getAllBanners = async () => {
    return smartCache.getOrFetch(
        smartCache.keys.bannersAll(),
        async () => {
            const prisma = getPrisma();
            return await prisma.promotionalBanner.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
        },
        { type: 'banners', swr: true }
    );
};

/**
 * Get single banner by ID (admin)
 */
export const getBannerById = async (id) => {
    return smartCache.getOrFetch(
        smartCache.keys.banner(id),
        async () => {
            const prisma = getPrisma();
            return await prisma.promotionalBanner.findUnique({
                where: { id },
                include: {
                    creator: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
        },
        { type: 'banners', swr: true }
    );
};

/**
 * Update banner
 */
export const updateBanner = async (id, bannerData) => {
    const prisma = getPrisma();

    // OPTIMIZATION: Handle _changedFields directive
    const frontendChangedFields = bannerData._changedFields;
    delete bannerData._changedFields;

    // Skip if no changes
    if (frontendChangedFields && frontendChangedFields.length === 0) {
        logger.info(`[PERF] No changes for banner ${id}, skipping update`);
        return await prisma.promotionalBanner.findUnique({ where: { id } });
    }

    const banner = await prisma.promotionalBanner.update({
        where: { id },
        data: bannerData
    });

    // Conditional cache invalidation
    const publicFields = ['title', 'description', 'imageUrl', 'linkUrl', 'isActive', 'startDate', 'endDate', 'priority'];
    const hasPublicChanges = !frontendChangedFields || frontendChangedFields.some(f => publicFields.includes(f));

    if (hasPublicChanges) {
        await invalidateBannerCache();
    } else {
        logger.info(`[PERF] Skipping banner cache invalidation - no public changes`);
    }

    return banner;
};

/**
 * Delete banner
 */
export const deleteBanner = async (id) => {
    const prisma = getPrisma();

    const banner = await prisma.promotionalBanner.delete({
        where: { id }
    });

    // Invalidate cache after delete
    await invalidateBannerCache();

    return banner;
};

export default {
    createBanner,
    getActiveBanners,
    getAllBanners,
    getBannerById,
    updateBanner,
    deleteBanner
};
