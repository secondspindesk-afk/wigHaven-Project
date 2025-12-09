import express from 'express';
import Joi from 'joi';
import * as bannerController from '../controllers/bannerController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';

const router = express.Router();

// Validation schemas
const createBannerSchema = Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow('', null),
    imageUrl: Joi.string().uri().required(),
    linkUrl: Joi.string().uri().optional().allow('', null),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    priority: Joi.number().integer().min(0).max(100).default(0),
    isActive: Joi.boolean().default(true),
    notifyUsers: Joi.boolean().default(false)
});

const updateBannerSchema = Joi.object({
    title: Joi.string().min(1).max(255),
    description: Joi.string().max(1000).allow('', null),
    imageUrl: Joi.string().uri(),
    linkUrl: Joi.string().uri().allow('', null),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    priority: Joi.number().integer().min(0).max(100),
    isActive: Joi.boolean(),
    notifyUsers: Joi.boolean()
}).min(1);

// Public route
router.get('/banners', bannerController.getActiveBanners);

// Admin routes
router.get('/admin/banners', authenticateToken, requireAdmin, bannerController.getAllBanners);
router.get('/admin/banners/:id', authenticateToken, requireAdmin, bannerController.getBannerById);
router.post('/admin/banners', authenticateToken, requireAdmin, validateRequest(createBannerSchema), bannerController.createBanner);
router.put('/admin/banners/:id', authenticateToken, requireAdmin, validateRequest(updateBannerSchema), bannerController.updateBanner);
router.delete('/admin/banners/:id', authenticateToken, requireAdmin, bannerController.deleteBanner);

export default router;
