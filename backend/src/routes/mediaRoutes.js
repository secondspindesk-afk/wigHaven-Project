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
 */

// All routes require admin
router.use(authenticateToken, requireAdmin);

// List all media with filters
router.get('/admin/media', mediaController.listMedia);

// Get trash
router.get('/admin/media/trash', mediaController.getTrash);

// Restore from trash 
router.post('/admin/media/:id/restore', mediaController.restore);

// Soft delete (move to trash)
router.delete('/admin/media/:id/soft', mediaController.softDelete);

// Hard delete (permanent)
router.delete('/admin/media/:id/hard', mediaController.hardDelete);

// Batch delete
router.delete('/admin/media/batch', validateRequest(batchDeleteSchema), mediaController.batchDelete);

// Empty trash
router.delete('/admin/media/trash/clear', mediaController.emptyTrash);

// Sync media
router.post('/admin/media/sync', mediaController.syncMedia);

export default router;
