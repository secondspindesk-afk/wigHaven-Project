import { getPrisma } from '../config/database.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';
import smartCache from '../utils/smartCache.js';

/**
 * Invalidate banner cache
 * Call this when banners are created/updated/deleted
 */
const invalidateBannerCache = () => {
    smartCache.del(smartCache.keys.banners());
    logger.debug('[CACHE] Banner cache invalidated');
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
    invalidateBannerCache();

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
};

/**
 * Get single banner by ID (admin)
 */
export const getBannerById = async (id) => {
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
};

/**
 * Update banner
 */
export const updateBanner = async (id, bannerData) => {
    const prisma = getPrisma();

    const banner = await prisma.promotionalBanner.update({
        where: { id },
        data: bannerData
    });

    // Invalidate cache after update
    invalidateBannerCache();

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
    invalidateBannerCache();

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
