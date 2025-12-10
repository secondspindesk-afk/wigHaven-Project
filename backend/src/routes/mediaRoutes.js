import express from 'express';
import Joi from 'joi';
import * as mediaController from '../controllers/mediaController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';

const router = express.Router();

// Validation schema for batch delete
const batchDeleteSchema = Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required()
});

/**
 * Media Routes - Admin only
 * All routes require authentication and admin privileges
 * 
 * CRITICAL: Do NOT use router.use(authenticateToken) here!
 * That would intercept ALL /api/* requests since this router is
 * mounted at /api with app.use('/api', mediaRoutes).
 * Instead, add middleware to each route individually.
 */

// List all media with filters
router.get('/admin/media', authenticateToken, requireAdmin, mediaController.listMedia);

// Get trash
router.get('/admin/media/trash', authenticateToken, requireAdmin, mediaController.getTrash);

// Restore from trash 
router.post('/admin/media/:id/restore', authenticateToken, requireAdmin, mediaController.restore);

// Soft delete (move to trash)
router.delete('/admin/media/:id/soft', authenticateToken, requireAdmin, mediaController.softDelete);

// Hard delete (permanent)
router.delete('/admin/media/:id/hard', authenticateToken, requireAdmin, mediaController.hardDelete);

// Batch delete
router.delete('/admin/media/batch', authenticateToken, requireAdmin, validateRequest(batchDeleteSchema), mediaController.batchDelete);

// Empty trash
router.delete('/admin/media/trash/clear', authenticateToken, requireAdmin, mediaController.emptyTrash);

// Sync media
router.post('/admin/media/sync', authenticateToken, requireAdmin, mediaController.syncMedia);

export default router;

