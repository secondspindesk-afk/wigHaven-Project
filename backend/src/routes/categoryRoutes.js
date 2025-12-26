import express from 'express';
import categoryController from '../controllers/categoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { noCache } from '../middleware/cacheControl.js';

const router = express.Router();

// Public Routes - noCache for real-time WebSocket updates
router.get('/categories', noCache, categoryController.listCategories);
router.get('/categories/:id', noCache, categoryController.getCategory);

// Admin Routes
router.get(
    '/admin/categories',
    authenticateToken,
    requireAdmin,
    categoryController.listCategories
);

router.post(
    '/admin/categories',
    authenticateToken,
    requireAdmin,
    categoryController.createCategory
);

router.patch(
    '/admin/categories/:id',
    authenticateToken,
    requireAdmin,
    categoryController.updateCategory
);

router.delete(
    '/admin/categories/:id',
    authenticateToken,
    requireAdmin,
    categoryController.deleteCategory
);

export default router;
