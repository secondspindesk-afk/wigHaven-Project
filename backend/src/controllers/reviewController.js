import reviewService from '../services/reviewService.js';
import logger from '../utils/logger.js';
import { notifyReviewsChanged } from '../utils/adminBroadcast.js';

/**
 * Create review with comprehensive validation
 */
export const createReview = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11: was req.user.userId
        const { productId, rating, title, content, images } = req.body;

        // Validate required fields
        if (!productId || !rating || !title || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['productId', 'rating', 'title', 'content']
            });
        }

        // Validate title length
        if (title.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Title must be at least 3 characters'
            });
        }

        if (title.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'Title too long (max 255 characters)'
            });
        }

        // Validate content length
        if (content.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Review content must be at least 10 characters'
            });
        }

        if (content.length > 5000) {
            return res.status(400).json({
                success: false,
                error: 'Review content too long (max 5000 characters)'
            });
        }

        const review = await reviewService.createReview(userId, req.body, req.user);

        // Fetch product for notifications
        const productService = (await import('../services/productService.js')).default;
        const product = await productService.getProductById(productId);

        if (product) {
            const notificationService = (await import('../services/notificationService.js')).default;

            // Notify user
            await notificationService.notifyReviewSubmitted(
                { userId: userId },
                { id: productId, name: product.name }
            );

            // Notify admins (CRITICAL - needs moderation)
            await notificationService.notifyAdminNewReview(
                { id: review.id, rating, userId },
                { id: productId, name: product.name }
            );
        }

        // 🔔 Real-time: Notify all admin dashboards
        notifyReviewsChanged({ action: 'created', reviewId: review.id, productId });

        res.status(201).json({
            success: true,
            data: review,
            message: 'Review submitted successfully. It will be visible after admin approval.'
        });
    } catch (error) {
        logger.error('Create Review Error:', error);

        // FIXED BUG #15: Specific error messages
        if (error.message.includes('Rating must be')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        if (error.message.includes('Images')) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to submit review',
            message: error.message
        });
    }
};

/**
 * Get product reviews with pagination
 */
export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                error: 'Product ID is required'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await reviewService.getProductReviews(productId, page, limit);

        res.json({
            success: true,
            data: result.reviews,
            stats: result.stats,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Get Reviews Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reviews',
            message: error.message
        });
    }
};

export const approveReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await reviewService.approveReview(id);

        // Send Review Approved Email
        if (review.user && review.product) {
            const emailService = (await import('../services/emailService.js')).default;
            await emailService.sendReviewApproved(review, review.user, review.product);
        }

        // 🔔 Real-time: Notify all admin dashboards
        notifyReviewsChanged({ action: 'approved', reviewId: id });

        res.json({
            success: true,
            data: review,
            message: 'Review approved successfully'
        });
    } catch (error) {
        logger.error('Approve Review Error:', error);
        res.status(error.message === 'Review not found' ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        await reviewService.deleteReview(id);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        logger.error('Delete Review Error:', error);
        res.status(error.message === 'Review not found' ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get all reviews (Admin)
 */
export const getAllReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { status, search, productId } = req.query;

        const result = await reviewService.getAllReviews(page, limit, { status, search, productId });

        res.json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Get All Reviews Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reviews'
        });
    }
};

/**
 * Update review (Admin)
 */
export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, rating, isApproved } = req.body;

        const review = await reviewService.updateReview(id, {
            title,
            content,
            rating,
            isApproved
        });

        res.json({
            success: true,
            data: review,
            message: 'Review updated successfully'
        });
    } catch (error) {
        logger.error('Update Review Error:', error);
        res.status(error.message === 'Review not found' ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Mark review as helpful
 */
export const markHelpful = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'You must be logged in to vote'
            });
        }

        const result = await reviewService.markReviewHelpful(id, userId);

        res.json({
            success: true,
            data: { helpfulCount: result.helpfulCount, action: result.action },
            message: result.action === 'added' ? 'Marked as helpful' : 'Vote removed'
        });
    } catch (error) {
        logger.error('Mark Helpful Error:', error);
        res.status(error.message === 'Review not found' ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
};

export const rejectReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await reviewService.rejectReview(id);

        // 🔔 Real-time: Notify all admin dashboards
        notifyReviewsChanged({ action: 'rejected', reviewId: id });

        res.json({
            success: true,
            data: review,
            message: 'Review rejected successfully'
        });
    } catch (error) {
        logger.error('Reject Review Error:', error);
        res.status(error.message === 'Review not found' ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
};

export const bulkUpdateReviews = async (req, res) => {
    try {
        const { ids, action } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Review IDs are required'
            });
        }

        if (!['approve', 'reject', 'delete'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action'
            });
        }

        const result = await reviewService.bulkUpdateReviews(ids, action);

        // 🔔 Real-time: Notify all admin dashboards
        notifyReviewsChanged({ action: 'bulk_' + action, count: result.count });

        res.json({
            success: true,
            data: result,
            message: `Successfully ${result.action} ${result.count} reviews`
        });
    } catch (error) {
        logger.error('Bulk Update Reviews Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk action'
        });
    }
};

export const updateUserReviewStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;

        if (!['standard', 'trusted', 'blocked'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const user = await reviewService.updateUserReviewStatus(userId, status);

        res.json({
            success: true,
            data: user,
            message: `User review status updated to ${status}`
        });
    } catch (error) {
        logger.error('Update User Review Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user status'
        });
    }
};

export default {
    createReview,
    getProductReviews,
    approveReview,
    rejectReview,
    deleteReview,
    getAllReviews,
    updateReview,
    markHelpful,
    bulkUpdateReviews,
    updateUserReviewStatus
};
