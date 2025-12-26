import express from 'express';
import productController from '../controllers/productController.js';
import variantController from '../controllers/variantController.js';
import * as reviewController from '../controllers/reviewController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest, createProductSchema, updateProductSchema, createVariantSchema, updateVariantSchema } from '../utils/validators.js';
import { shortCache, noCache } from '../middleware/cacheControl.js';

const router = express.Router();

// --- PUBLIC ENDPOINTS ---
// NOTE: Using noCache for products/categories because WebSocket handles real-time
// invalidation via React Query. HTTP caching (even ETag) would cause browsers 
// to serve stale data even after WebSocket invalidation.

// Search products (must be before :id to avoid conflict)
router.get('/products/search', noCache, productController.searchProducts);

// Get categories with counts (real-time updates)
router.get('/products/categories', noCache, productController.getCategories);

// List products (real-time updates via WebSocket)
router.get('/products', noCache, productController.listProducts);

// Get single product (real-time updates via WebSocket)
router.get('/products/:id', noCache, productController.getProduct);

// Get product variants (real-time updates)
router.get('/products/:id/variants', noCache, variantController.getProductVariants);

// Get product reviews (public route, short cache since reviews change)
router.get('/products/:id/reviews', shortCache, (req, res) => {
    req.params.productId = req.params.id;
    return reviewController.getProductReviews(req, res);
});

// Get single variant by ID (real-time updates)
router.get('/variants/:id', noCache, variantController.getVariant);


import multer from 'multer';
import os from 'os';

// Configure Multer for temporary file storage
const upload = multer({ dest: os.tmpdir() });

// --- ADMIN ENDPOINTS (Protected) ---

// Bulk Upload Products
router.post(
    '/admin/products/bulk-upload',
    authenticateToken,
    requireAdmin,
    upload.single('file'),
    productController.bulkUpload
);

// Bulk Delete Products
router.delete(
    '/admin/products/bulk',
    authenticateToken,
    requireAdmin,
    productController.bulkDelete
);

// Bulk Update Status
router.patch(
    '/admin/products/bulk-status',
    authenticateToken,
    requireAdmin,
    productController.bulkUpdateStatus
);

// Create product
router.post(
    '/admin/products',
    authenticateToken,
    requireAdmin,
    validateRequest(createProductSchema),
    productController.createProduct
);

// List products (Admin)
router.get(
    '/admin/products',
    authenticateToken,
    requireAdmin,
    productController.listAdminProducts
);

// Get single product (Admin)
router.get(
    '/admin/products/:id',
    authenticateToken,
    requireAdmin,
    productController.getAdminProduct
);

// Update product
router.patch(
    '/admin/products/:id',
    authenticateToken,
    requireAdmin,
    validateRequest(updateProductSchema),
    productController.updateProduct
);

// Delete product
router.delete(
    '/admin/products/:id',
    authenticateToken,
    requireAdmin,
    productController.deleteProduct
);

// Duplicate product
router.post(
    '/admin/products/:id/duplicate',
    authenticateToken,
    requireAdmin,
    productController.duplicateProduct
);

// Create variant
router.post(
    '/admin/variants',
    authenticateToken,
    requireAdmin,
    validateRequest(createVariantSchema),
    variantController.createVariant
);

// Get variant (Admin)
router.get(
    '/admin/variants/:id',
    authenticateToken,
    requireAdmin,
    variantController.getVariant
);

// Bulk update variants
router.patch(
    '/admin/inventory/bulk-update',
    authenticateToken,
    requireAdmin,
    variantController.bulkUpdateVariants
);

// Update variant
router.patch(
    '/admin/variants/:id',
    authenticateToken,
    requireAdmin,
    validateRequest(updateVariantSchema),
    variantController.updateVariant
);

// Delete variant
router.delete(
    '/admin/variants/:id',
    authenticateToken,
    requireAdmin,
    variantController.deleteVariant
);

export default router;
