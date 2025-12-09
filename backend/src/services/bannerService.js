import { getPrisma } from '../config/database.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

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
 * Get active banners (for frontend display)
 */
export const getActiveBanners = async () => {
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

    return await prisma.promotionalBanner.update({
        where: { id },
        data: bannerData
    });
};

/**
 * Delete banner
 */
export const deleteBanner = async (id) => {
    const prisma = getPrisma();

    return await prisma.promotionalBanner.delete({
        where: { id }
    });
};

export default {
    createBanner,
    getActiveBanners,
    getAllBanners,
    getBannerById,
    updateBanner,
    deleteBanner
};
