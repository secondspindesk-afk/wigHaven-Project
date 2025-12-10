import productService from '../services/productService.js';
import searchService from '../services/searchService.js';
import logger from '../utils/logger.js';
import { notifyProductsChanged } from '../utils/adminBroadcast.js';

/**
 * Create product (Admin)
 * Passes user ID for proper image tracking in Media table
 */
export const createProduct = async (req, res, next) => {
    try {
        const product = await productService.createProduct(req.body, req.user?.id);

        // 🔔 Real-time: Notify all admin dashboards
        notifyProductsChanged({ action: 'created', productId: product.id });

        res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List products (Public)
 */
export const listProducts = async (req, res, next) => {
    try {
        const { page, category, minPrice, maxPrice, sort, inStock, search } = req.query;

        const result = await productService.listProducts({
            page: parseInt(page) || 1,
            limit: 20,
            category,
            minPrice,
            maxPrice,
            sort,
            inStock,
            search,
            isAdmin: false,
        });

        res.json({
            success: true,
            data: {
                products: result.products,
                total: result.total,
                pages: result.pages,
                page: result.currentPage,
                limit: 20
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List products (Admin)
 */
export const listAdminProducts = async (req, res, next) => {
    try {
        const { page, category, minPrice, maxPrice, sort, inStock, search, limit } = req.query;

        const result = await productService.listProducts({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            category,
            minPrice,
            maxPrice,
            sort,
            inStock,
            search,
            isAdmin: true,
        });

        res.json({
            success: true,
            data: {
                products: result.products,
                total: result.total,
                pages: result.pages,
                page: result.currentPage,
                limit: parseInt(limit) || 20
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Search products (Public)
 */
export const searchProducts = async (req, res, next) => {
    try {
        const { q, page } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Search query must be at least 2 characters',
                },
            });
        }

        const result = await searchService.searchProducts(q, parseInt(page) || 1);

        res.json({
            success: true,
            data: {
                products: result.products,
                total: result.total,
                page: result.page,
                limit: result.limit
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single product (Public)
 */
export const getProduct = async (req, res, next) => {
    const startTime = Date.now();
    try {
        const { id } = req.params;
        logger.info(`[PERF] getProduct start for ${id}`);

        const serviceStart = Date.now();
        const product = await productService.getProductById(id);
        const serviceTime = Date.now() - serviceStart;
        logger.info(`[PERF] productService.getProductById took ${serviceTime}ms`);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Product not found',
                },
            });
        }

        const totalTime = Date.now() - startTime;
        logger.info(`[PERF] Total getProduct time: ${totalTime}ms`);

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        const totalTime = Date.now() - startTime;
        logger.error(`[PERF] getProduct failed after ${totalTime}ms:`, error);
        next(error);
    }
};

/**
 * Get single product (Admin)
 */
export const getAdminProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await productService.getAdminProductById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Product not found',
                },
            });
        }

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update product (Admin)
 */
export const updateProduct = async (req, res, next) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body, req.user?.id);

        // 🔔 Real-time: Notify all admin dashboards
        notifyProductsChanged({ action: 'updated', productId: req.params.id });

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        if (error.code === 'P2025') { // Prisma record not found
            return res.status(404).json({
                success: false,
                error: { message: 'Product not found' },
            });
        }
        next(error);
    }
};

/**
 * Delete product (Admin)
 */
export const deleteProduct = async (req, res, next) => {
    try {
        await productService.deleteProduct(req.params.id);

        // 🔔 Real-time: Notify all admin dashboards
        notifyProductsChanged({ action: 'deleted', productId: req.params.id });

        res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: { message: 'Product not found' },
            });
        }
        next(error);
    }
};

/**
 * Get product categories (Public)
 */
export const getCategories = async (req, res, next) => {
    try {
        const categories = await productService.getCategories();
        res.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk Upload Products (Admin)
 */
export const bulkUpload = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const results = await productService.bulkUploadProducts(req.file.path);

        res.json({
            success: true,
            data: results,
            message: `Processed ${results.success} products, ${results.failed} failed.`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk Delete Products (Admin)
 */
export const bulkDelete = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No product IDs provided'
            });
        }

        const results = await productService.bulkDeleteProducts(ids);
        res.json({
            success: true,
            data: results,
            message: `Deleted ${results.success} products`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk Update Status (Admin)
 */
export const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { ids, isActive } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No product IDs provided'
            });
        }

        const result = await productService.bulkUpdateProductStatus(ids, isActive);
        res.json({
            success: true,
            data: result,
            message: `Updated ${result.count} products`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Duplicate product (Admin)
 */
export const duplicateProduct = async (req, res, next) => {
    try {
        const product = await productService.duplicateProduct(req.params.id);
        res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        if (error.message === 'Product not found') {
            return res.status(404).json({
                success: false,
                error: { message: error.message }
            });
        }
        next(error);
    }
};

export default {
    createProduct,
    listProducts,
    listAdminProducts,
    searchProducts,
    getProduct,
    getAdminProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    getCategories,
    bulkUpload,
    bulkDelete,
    bulkUpdateStatus,
};
