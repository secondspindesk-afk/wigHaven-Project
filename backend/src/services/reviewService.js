import reviewRepository from '../db/repositories/reviewRepository.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import adminBroadcast from '../utils/adminBroadcast.js';
import smartCache from '../utils/smartCache.js';

/**
 * Create review with verified purchase check and proper validation
 */
import settingsService from './settingsService.js';

export const createReview = async (userId, reviewData, user) => {
    const { productId, rating, title, content, images } = reviewData;

    // Validate rating range
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        throw new Error('Rating must be a number between 1 and 5');
    }

    // Validate min review length from settings
    const minReviewLength = await settingsService.getSetting('minReviewLength');
    if (minReviewLength && Number(minReviewLength) > 0) {
        if (!content || content.trim().length < Number(minReviewLength)) {
            throw new Error(`Review must be at least ${minReviewLength} characters long`);
        }
    }

    // Validate images array
    if (images && (!Array.isArray(images) || images.length > 5)) {
        throw new Error('Images must be an array of maximum 5 items');
    }

    // Check User Review Status
    if (user.reviewStatus === 'blocked') {
        throw new Error('You are not allowed to post reviews.');
    }

    // Validate image URLs and ownership
    if (images && images.length > 0) {
        // Allow query parameters after extension
        const validUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i;
        for (const img of images) {
            if (typeof img !== 'string' || !validUrlPattern.test(img)) {
                logger.error(`Invalid image URL format: ${img}`);
                throw new Error(`Invalid image URL format: ${img}`);
            }
        }

        // Verify ownership and existence in Media table
        const prisma = getPrisma();

        // Strip query parameters for DB lookup (e.g. ?v=123)
        const cleanImageUrls = images.map(url => url.split('?')[0]);

        logger.info(`Validating images for review. Input: ${JSON.stringify(images)}, Cleaned: ${JSON.stringify(cleanImageUrls)}`);

        const mediaRecords = await prisma.media.findMany({
            where: {
                url: { in: cleanImageUrls },
                status: 'active'
            }
        });

        logger.info(`Found media records: ${mediaRecords.length} for ${cleanImageUrls.length} images`);

        if (mediaRecords.length !== images.length) {
            const foundUrls = mediaRecords.map(m => m.url);
            // Check against clean URLs
            const missingUrls = cleanImageUrls.filter(url => !foundUrls.includes(url));
            logger.error(`Missing images in DB: ${JSON.stringify(missingUrls)}. Found: ${JSON.stringify(foundUrls)}`);
            throw new Error(`Invalid or missing images: ${missingUrls.join(', ')}`);
        }

        // Check ownership
        const unauthorizedImages = mediaRecords.filter(m => m.uploadedBy !== userId);
        if (unauthorizedImages.length > 0) {
            logger.error(`Unauthorized images: ${JSON.stringify(unauthorizedImages.map(m => m.url))} by user ${userId}`);
            throw new Error('You can only attach images that you have uploaded');
        }
    }

    // Verify purchase
    const prisma = getPrisma();
    const verifiedOrder = await prisma.order.findFirst({
        where: {
            userId,
            status: 'delivered',
            items: {
                some: {
                    variant: {
                        productId: productId
                    }
                }
            }
        },
        select: { id: true, orderNumber: true }
    });

    const isVerified = !!verifiedOrder;

    // Handle null names properly
    const authorName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || user.lastName || user.email?.split('@')[0] || 'Anonymous';

    // Determine Approval Status
    let isApproved = false;

    if (user.reviewStatus === 'trusted') {
        isApproved = true;
    } else {
        // Check global setting
        const autoApprove = await settingsService.getSetting('review_auto_approve');
        isApproved = !!autoApprove;
    }

    logger.info(`User ${userId} (${authorName}) submitted ${isVerified ? 'verified' : 'unverified'} review for product ${productId}. Status: ${isApproved ? 'Approved' : 'Pending'}`);

    const review = await reviewRepository.createReview({
        userId,
        productId,
        orderId: verifiedOrder ? verifiedOrder.id : null,
        rating: ratingNum,
        title: title.trim(),
        content: content.trim(),
        images: images || [],
        authorName,
        isVerified,
        isApproved
    });

    // Link media records
    if (images && images.length > 0) {
        await prisma.media.updateMany({
            where: { url: { in: images } },
            data: {
                usedBy: review.id,
                usageType: 'review_image'
            }
        });
    }

    // Broadcast after creation
    await adminBroadcast.notifyReviewsChanged();

    return review;
};

/**
 * Get product reviews with stats and pagination
 */
export const getProductReviews = async (productId, page = 1, limit = 10) => {
    // FIXED BUG #4: Validate pagination
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 10)); // Max 50 per page
    const skip = Math.max(0, (safePage - 1) * safeLimit);

    const cacheKey = smartCache.keys.reviews(productId, safePage);

    return smartCache.getOrFetch(
        cacheKey,
        async () => {
            const [reviews, total, distributionData] = await Promise.all([
                reviewRepository.findReviewsByProductId(productId, skip, safeLimit),
                reviewRepository.countReviewsByProductId(productId),
                reviewRepository.getRatingDistribution(productId)
            ]);

            // Calculate stats
            const stats = {
                total,
                average: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };

            let sum = 0;
            distributionData.forEach(d => {
                stats.distribution[d.rating] = d._count.rating;
                sum += d.rating * d._count.rating;
            });

            // Prevent division by zero
            stats.average = total > 0 ? Number((sum / total).toFixed(1)) : 0;

            return {
                reviews,
                stats,
                pagination: {
                    page: safePage,
                    limit: safeLimit,
                    total,
                    pages: Math.ceil(total / safeLimit)
                }
            };
        },
        { type: 'reviews', swr: true }
    );
};

/**
 * Approve a review
 */
export const approveReview = async (id) => {
    const review = await reviewRepository.findReviewById(id);
    if (!review) {
        throw new Error('Review not found');
    }

    const result = await reviewRepository.updateReviewStatus(id, true);
    await adminBroadcast.notifyReviewsChanged();
    return result;
};

/**
 * Reject a review (Set isApproved = false)
 */
export const rejectReview = async (id) => {
    const review = await reviewRepository.findReviewById(id);
    if (!review) {
        throw new Error('Review not found');
    }

    const result = await reviewRepository.updateReviewStatus(id, false);
    await adminBroadcast.notifyReviewsChanged();
    return result;
};

/**
 * Delete a review
 */
export const deleteReview = async (id) => {
    const review = await reviewRepository.findReviewById(id);
    if (!review) {
        throw new Error('Review not found');
    }

    const result = await reviewRepository.deleteReview(id);
    await adminBroadcast.notifyReviewsChanged({ productId: review.productId, action: 'delete' });
    return result;
};



/**
 * Get all reviews (Admin)
 */
export const getAllReviews = async (page = 1, limit = 20, filters = {}) => {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = Math.max(0, (safePage - 1) * safeLimit);

    const { reviews, total } = await reviewRepository.findAllReviews(skip, safeLimit, filters);

    return {
        reviews,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            pages: Math.ceil(total / safeLimit)
        }
    };
};

/**
 * Update review content (Admin)
 */
export const updateReview = async (id, data) => {
    // OPTIMIZATION: Handle _changedFields directive
    const frontendChangedFields = data._changedFields;
    delete data._changedFields;

    // Skip if no changes
    if (frontendChangedFields && frontendChangedFields.length === 0) {
        logger.info(`[PERF] No changes for review ${id}, skipping update`);
        return await reviewRepository.findReviewById(id);
    }

    const review = await reviewRepository.findReviewById(id);
    if (!review) {
        throw new Error('Review not found');
    }

    const result = await reviewRepository.updateReview(id, data);

    // Conditional cache invalidation - only if approval status changed
    const publicFields = ['isApproved', 'rating', 'comment'];
    const hasPublicChanges = !frontendChangedFields || frontendChangedFields.some(f => publicFields.includes(f));

    if (hasPublicChanges) {
        await adminBroadcast.notifyReviewsChanged();
    } else {
        logger.info(`[PERF] Skipping review cache invalidation - no public changes`);
    }

    return result;
};

/**
 * Mark review as helpful
 */
export const markReviewHelpful = async (id, userId) => {
    const prisma = getPrisma();
    const review = await reviewRepository.findReviewById(id);
    if (!review) {
        throw new Error('Review not found');
    }

    // Check if user has already voted
    const existingVote = await prisma.reviewVote.findUnique({
        where: {
            reviewId_userId: {
                reviewId: id,
                userId: userId
            }
        }
    });

    if (existingVote) {
        // Remove vote (Toggle OFF)
        await prisma.$transaction([
            prisma.reviewVote.delete({
                where: { id: existingVote.id }
            }),
            prisma.review.update({
                where: { id },
                data: { helpfulCount: { decrement: 1 } }
            })
        ]);
        return { helpfulCount: review.helpfulCount - 1, action: 'removed' };
    } else {
        // Add vote (Toggle ON)
        await prisma.$transaction([
            prisma.reviewVote.create({
                data: {
                    reviewId: id,
                    userId: userId
                }
            }),
            prisma.review.update({
                where: { id },
                data: { helpfulCount: { increment: 1 } }
            })
        ]);
        return { helpfulCount: review.helpfulCount + 1, action: 'added' };
    }
};

/**
 * Bulk update reviews (Admin)
 */
export const bulkUpdateReviews = async (ids, action) => {
    const prisma = getPrisma();
    let result;

    if (action === 'delete') {
        result = await prisma.review.deleteMany({
            where: { id: { in: ids } }
        });
    } else if (action === 'approve') {
        result = await prisma.review.updateMany({
            where: { id: { in: ids } },
            data: { isApproved: true }
        });
    } else if (action === 'reject') {
        result = await prisma.review.updateMany({
            where: { id: { in: ids } },
            data: { isApproved: false }
        });
    } else {
        throw new Error('Invalid bulk action');
    }

    // 🔔 Real-time: Notify all admin dashboards
    await adminBroadcast.notifyReviewsChanged();

    return { count: result.count || result, action };
};

/**
 * Update User Review Status (Trust/Block)
 */
export const updateUserReviewStatus = async (userId, status) => {
    const prisma = getPrisma();

    if (!['standard', 'trusted', 'blocked'].includes(status)) {
        throw new Error('Invalid status');
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: { reviewStatus: status }
    });

    // 🔔 Real-time sync
    await adminBroadcast.notifyUsersChanged({ action: 'review_status_changed', userId });

    return user;
};

export default {
    createReview,
    getProductReviews,
    approveReview,
    rejectReview,
    deleteReview,
    getAllReviews,
    updateReview,
    markReviewHelpful,
    bulkUpdateReviews,
    updateUserReviewStatus
};
