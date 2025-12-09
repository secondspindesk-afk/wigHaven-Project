import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

export const createReview = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.create({ data });
    } catch (error) {
        logger.error('Error creating review:', error);
        throw error;
    }
};

export const findReviewsByProductId = async (productId, skip = 0, take = 10) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.findMany({
            where: {
                productId,
                isApproved: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    } catch (error) {
        logger.error('Error finding reviews:', error);
        throw error;
    }
};

export const countReviewsByProductId = async (productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.count({
            where: {
                productId,
                isApproved: true
            }
        });
    } catch (error) {
        logger.error('Error counting reviews:', error);
        throw error;
    }
};

export const getRatingDistribution = async (productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.groupBy({
            by: ['rating'],
            where: { productId, isApproved: true },
            _count: { rating: true }
        });
    } catch (error) {
        logger.error('Error getting rating distribution:', error);
        throw error;
    }
};

export const findReviewById = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.findUnique({ where: { id } });
    } catch (error) {
        logger.error('Error finding review by ID:', error);
        throw error;
    }
};

export const updateReviewStatus = async (id, isApproved) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.update({
            where: { id },
            data: { isApproved },
            include: {
                user: true,
                product: true
            }
        });
    } catch (error) {
        logger.error('Error updating review status:', error);
        throw error;
    }
};

export const deleteReview = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.delete({ where: { id } });
    } catch (error) {
        logger.error('Error deleting review:', error);
        throw error;
    }
};

export const findAllReviews = async (skip = 0, take = 20, filters = {}) => {
    try {
        const prisma = getPrisma();
        const where = {};

        if (filters.status) {
            where.isApproved = filters.status === 'approved';
        }

        if (filters.productId) {
            where.productId = filters.productId;
        }

        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { content: { contains: filters.search, mode: 'insensitive' } },
                { authorName: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    product: {
                        select: { name: true, images: true }
                    },
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            reviewStatus: true
                        }
                    }
                }
            }),
            prisma.review.count({ where })
        ]);

        return { reviews, total };
    } catch (error) {
        logger.error('Error finding all reviews:', error);
        throw error;
    }
};

export const updateReview = async (id, data) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.update({
            where: { id },
            data
        });
    } catch (error) {
        logger.error('Error updating review:', error);
        throw error;
    }
};

export const incrementHelpfulCount = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.review.update({
            where: { id },
            data: {
                helpfulCount: {
                    increment: 1
                }
            }
        });
    } catch (error) {
        logger.error('Error incrementing helpful count:', error);
        throw error;
    }
};

export default {
    createReview,
    findReviewsByProductId,
    countReviewsByProductId,
    getRatingDistribution,
    findReviewById,
    updateReviewStatus,
    deleteReview,
    findAllReviews,
    updateReview,
    incrementHelpfulCount
};
