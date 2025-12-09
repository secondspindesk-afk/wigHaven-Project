import bannerService from '../services/bannerService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/banners
 * Get active banners (PUBLIC)
 */
export const getActiveBanners = async (req, res) => {
    try {
        const banners = await bannerService.getActiveBanners();

        res.json({
            success: true,
            data: banners
        });
    } catch (error) {
        logger.error('Get active banners error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch banners'
        });
    }
};

/**
 * GET /api/admin/banners
 * Get all banners (ADMIN)
 */
export const getAllBanners = async (req, res) => {
    try {
        const banners = await bannerService.getAllBanners();

        res.json({
            success: true,
            data: banners
        });
    } catch (error) {
        logger.error('Get all banners error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch banners'
        });
    }
};

/**
 * GET /api/admin/banners/:id
 * Get single banner by ID (ADMIN)
 */
export const getBannerById = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await bannerService.getBannerById(id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                error: 'Banner not found'
            });
        }

        res.json({
            success: true,
            data: banner
        });
    } catch (error) {
        logger.error('Get banner by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch banner'
        });
    }
};

/**
 * POST /api/admin/banners
 * Create promotional banner (ADMIN)
 */
export const createBanner = async (req, res) => {
    try {
        const { title, description, imageUrl, linkUrl, startDate, endDate, priority, notifyUsers } = req.body;

        if (!title || !imageUrl || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'title, imageUrl, startDate, and endDate are required'
            });
        }

        const banner = await bannerService.createBanner({
            title,
            description,
            imageUrl,
            linkUrl,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            priority: priority || 0,
            notifyUsers: notifyUsers || false
        }, req.user.id);

        res.status(201).json({
            success: true,
            data: banner,
            message: 'Banner created successfully'
        });
    } catch (error) {
        logger.error('Create banner error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create banner'
        });
    }
};

/**
 * PUT /api/admin/banners/:id
 * Update banner (ADMIN)
 */
export const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Parse dates if provided
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const banner = await bannerService.updateBanner(id, updateData);

        res.json({
            success: true,
            data: banner,
            message: 'Banner updated successfully'
        });
    } catch (error) {
        logger.error('Update banner error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update banner'
        });
    }
};

/**
 * DELETE /api/admin/banners/:id
 * Delete banner (ADMIN)
 */
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        await bannerService.deleteBanner(id);

        res.json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        logger.error('Delete banner error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete banner'
        });
    }
};

export default {
    getActiveBanners,
    getAllBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner
};
