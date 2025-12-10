import productService from '../services/productService.js';
import variantRepository from '../db/repositories/variantRepository.js';
import { notifyProductsChanged, notifyStockChanged } from '../utils/adminBroadcast.js';

/**
 * Create variant (Admin)
 */
export const createVariant = async (req, res, next) => {
    try {
        const variant = await productService.createVariant(req.body);

        // 🔔 Real-time: Notify all admin dashboards
        notifyProductsChanged({ action: 'variant_created', variantId: variant.id });
        notifyStockChanged({ action: 'variant_created' });

        res.status(201).json({
            success: true,
            data: variant,
        });
    } catch (error) {
        if (error.message === 'Product not found') {
            return res.status(404).json({ success: false, error: { message: error.message } });
        }
        if (error.message === 'SKU already exists') {
            return res.status(409).json({ success: false, error: { message: error.message } });
        }
        next(error);
    }
};

/**
 * Update variant (Admin)
 */
export const updateVariant = async (req, res, next) => {
    try {
        const variant = await productService.updateVariant(req.params.id, req.body);

        // 🔔 Real-time: Notify all admin dashboards
        notifyProductsChanged({ action: 'variant_updated', variantId: req.params.id });
        if (req.body.stock !== undefined) {
            notifyStockChanged({ action: 'stock_adjusted', variantId: req.params.id });
        }

        res.json({
            success: true,
            data: variant,
        });
    } catch (error) {
        if (error.message === 'Variant not found') {
            return res.status(404).json({ success: false, error: { message: error.message } });
        }
        if (error.message === 'SKU already exists') {
            return res.status(409).json({ success: false, error: { message: error.message } });
        }
        next(error);
    }
};

/**
 * Bulk update variants (Admin)
 */
export const bulkUpdateVariants = async (req, res, next) => {
    try {
        const { variantIds, updates } = req.body;

        if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'variantIds array is required' }
            });
        }

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'updates object is required' }
            });
        }

        const results = await productService.bulkUpdateVariants(variantIds, updates);

        // 🔔 Real-time: Notify all admin dashboards
        notifyProductsChanged({ action: 'bulk_variant_update', count: results.length });
        if (updates.stock !== undefined) {
            notifyStockChanged({ action: 'bulk_stock_adjusted' });
        }

        res.json({
            success: true,
            message: `Successfully updated ${results.length} variants`,
            data: { count: results.length }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete variant (Admin)
 */
export const deleteVariant = async (req, res, next) => {
    try {
        await productService.deleteVariant(req.params.id);
        res.json({
            success: true,
            message: 'Variant deleted successfully',
        });
    } catch (error) {
        if (error.message === 'Variant not found') {
            return res.status(404).json({ success: false, error: { message: error.message } });
        }
        if (error.message.includes('Cannot delete the last active variant')) {
            return res.status(400).json({ success: false, error: { message: error.message } });
        }
        next(error);
    }
};

/**
 * Get single variant by ID (Public)
 */
export const getVariant = async (req, res, next) => {
    try {
        const variant = await variantRepository.findVariantById(req.params.id);
        if (!variant) {
            return res.status(404).json({
                success: false,
                error: { message: 'Variant not found' }
            });
        }
        res.json({
            success: true,
            data: variant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get variants for a product (Public)
 */
export const getProductVariants = async (req, res, next) => {
    try {
        const variants = await variantRepository.getProductVariants(req.params.id);
        res.json({
            success: true,
            data: variants,
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createVariant,
    updateVariant,
    bulkUpdateVariants,
    deleteVariant,
    getVariant,
    getProductVariants,
};
