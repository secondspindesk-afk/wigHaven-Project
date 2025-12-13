import express from 'express';
import Joi from 'joi';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import reviewController from '../controllers/reviewController.js';
import { validateRequest } from '../utils/validators.js';
import rateLimit from 'express-rate-limit';
import { shortCache } from '../middleware/cacheControl.js';

const router = express.Router();

// Joi Validation Schemas
const createReviewSchema = Joi.object({
    productId: Joi.string().uuid().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().min(3).max(255).required(),
    content: Joi.string().min(10).max(5000).required(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional()
});

const updateReviewSchema = Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    content: Joi.string().min(10).max(5000).optional(),
    rating: Joi.number().integer().min(1).max(5).optional(),
    isApproved: Joi.boolean().optional()
});

const bulkUpdateSchema = Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
    action: Joi.string().valid('approve', 'reject', 'delete').required()
});

const userStatusSchema = Joi.object({
    userId: Joi.string().uuid().required(),
    status: Joi.string().valid('standard', 'trusted', 'blocked').required()
});

// Rate limiting for review creation (5 reviews per hour per user)
const reviewRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, error: 'Too many reviews. Please try again later.' },
    keyGenerator: (req) => req.user?.id || req.ip
});

// Public: Get reviews for a product (with cache - reviews change but short TTL is fine)
router.get('/product/:productId', shortCache, reviewController.getProductReviews);

// Protected: Create a review (with rate limiting and validation)
router.post('/', authenticateToken, reviewRateLimit, validateRequest(createReviewSchema), reviewController.createReview);

// Admin: List all reviews (with filters)
router.get('/admin/all', authenticateToken, requireAdmin, reviewController.getAllReviews);

// Admin: Update review
router.patch('/:id', authenticateToken, requireAdmin, validateRequest(updateReviewSchema), reviewController.updateReview);

// Admin: Approve review
router.patch('/:id/approve', authenticateToken, requireAdmin, reviewController.approveReview);

// Admin: Delete review
router.delete('/:id', authenticateToken, requireAdmin, reviewController.deleteReview);

// Admin: Reject review
router.patch('/:id/reject', authenticateToken, requireAdmin, reviewController.rejectReview);

// Admin: Bulk update reviews
router.post('/admin/bulk-update', authenticateToken, requireAdmin, validateRequest(bulkUpdateSchema), reviewController.bulkUpdateReviews);

// Admin: Update user review status
router.post('/admin/user-status', authenticateToken, requireAdmin, validateRequest(userStatusSchema), reviewController.updateUserReviewStatus);

// Protected: Mark review as helpful (requires auth for tracking)
router.post('/:id/helpful', authenticateToken, reviewController.markHelpful);

export default router;

