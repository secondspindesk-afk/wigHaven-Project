import discountService from '../services/discountService.js';
import logger from '../utils/logger.js';

/**
 * Create a new discount code (Admin)
 */
export const createDiscount = async (req, res) => {
    try {
        const { code, type, value, startsAt, expiresAt, maxUses, usesPerCustomer, minimumPurchase, isActive } = req.body;

        // Basic validation
        if (!code || !type || !value || !startsAt || !expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        if (type !== 'percentage' && type !== 'fixed') {
            return res.status(400).json({
                success: false,
                error: 'Invalid discount type. Must be "percentage" or "fixed"'
            });
        }

        const discount = await discountService.createDiscount({
            code: code.toUpperCase(),
            type,
            value: parseFloat(value),
            startsAt: new Date(startsAt),
            expiresAt: new Date(expiresAt),
            maxUses: maxUses ? parseInt(maxUses) : null,
            usesPerCustomer: usesPerCustomer ? parseInt(usesPerCustomer) : 1,
            minimumPurchase: minimumPurchase ? parseFloat(minimumPurchase) : null,
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({
            success: true,
            data: discount,
            message: 'Discount code created successfully'
        });
    } catch (error) {
        logger.error('Create Discount Error:', error);
        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'Discount code already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create discount code'
        });
    }
};

/**
 * Get all discount codes (Admin)
 */
export const getAllDiscounts = async (req, res) => {
    try {
        const discounts = await discountService.getAllDiscounts();
        res.json({
            success: true,
            data: discounts
        });
    } catch (error) {
        logger.error('Get All Discounts Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch discount codes'
        });
    }
};

/**
 * Delete a discount code (Admin)
 */
export const deleteDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        await discountService.deleteDiscount(id);
        res.json({
            success: true,
            message: 'Discount code deleted successfully'
        });
    } catch (error) {
        logger.error('Delete Discount Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete discount code'
        });
    }
};

/**
 * Validate a discount code (Public/Protected)
 * Used for checking validity without applying to cart immediately
 */
export const validateDiscount = async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!code || cartTotal === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Code and cartTotal are required'
            });
        }

        const result = await discountService.validateDiscount(code, parseFloat(cartTotal), userId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        // Don't log validation errors as errors, just warnings or info
        // logger.warn('Validate Discount Failed:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export default {
    createDiscount,
    getAllDiscounts,
    deleteDiscount,
    validateDiscount,
    getDiscountById: async (req, res) => {
        try {
            const { id } = req.params;
            const discount = await discountService.getDiscountById(id);
            if (!discount) {
                return res.status(404).json({ success: false, error: 'Discount not found' });
            }
            res.json({ success: true, data: discount });
        } catch (error) {
            logger.error('Get Discount By ID Error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch discount' });
        }
    },
    updateDiscount: async (req, res) => {
        try {
            const { id } = req.params;
            const { code, type, value, startsAt, expiresAt, maxUses, usesPerCustomer, minimumPurchase, isActive } = req.body;

            const discount = await discountService.updateDiscount(id, {
                code: code ? code.toUpperCase() : undefined,
                type,
                value: value ? parseFloat(value) : undefined,
                startsAt: startsAt ? new Date(startsAt) : undefined,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                maxUses: maxUses !== undefined ? (maxUses ? parseInt(maxUses) : null) : undefined,
                usesPerCustomer: usesPerCustomer ? parseInt(usesPerCustomer) : undefined,
                minimumPurchase: minimumPurchase !== undefined ? (minimumPurchase ? parseFloat(minimumPurchase) : null) : undefined,
                isActive
            });

            res.json({ success: true, data: discount, message: 'Discount updated successfully' });
        } catch (error) {
            logger.error('Update Discount Error:', error);
            res.status(500).json({ success: false, error: 'Failed to update discount' });
        }
    }
};
