import { getPrisma } from '../config/database.js';
import logger from './logger.js';

/**
 * Calculate cart totals (subtotal, tax, shipping, total)
 * @param {Array} items - List of cart items with price and quantity
 * @param {Object} settings - System settings (optional)
 * @returns {Object} Totals object
 */
export const calculateCartTotals = (items, settings = {}) => {
    const subtotal = items.reduce((sum, item) => {
        const price = item.unit_price || item.price || 0;
        return sum + (parseFloat(price) * item.quantity);
    }, 0);

    // Tax rate - configurable via settings, defaults to 0% if not set
    // NOTE: Many jurisdictions require different tax handling (e.g., tax-inclusive pricing, regional rates)
    // For simplicity, we apply a flat rate if configured. Set 'taxRate' in settings as a percentage (e.g., 6.25)
    const taxRate = settings.taxRate !== undefined ? parseFloat(settings.taxRate) / 100 : 0;
    const tax = subtotal * taxRate;

    // Shipping
    // Use settings if available, otherwise defaults
    const flatRate = settings.shippingFlatRate !== undefined ? parseFloat(settings.shippingFlatRate) : 10;
    const threshold = settings.freeShippingThreshold !== undefined ? parseFloat(settings.freeShippingThreshold) : 100;

    const shipping = subtotal >= threshold ? 0 : flatRate;

    const total = subtotal + tax + shipping;

    return {
        items_count: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
    };
};

import smartCache from './smartCache.js';

/**
 * Enrich cart items with product details
 * @param {Array} items - Basic cart items (variantId, quantity)
 * @returns {Promise<Array>} Enriched items
 */
export const enrichCartItems = async (items) => {
    const variantIds = items.map(item => item.variantId);
    if (variantIds.length === 0) return [];

    return smartCache.getOrFetch(
        smartCache.keys.cartEnrichment(variantIds),
        async () => {
            const prisma = getPrisma();

            // Log the IDs we are looking for
            logger.info(`[ENRICH] Looking for variants: ${variantIds.join(', ')}`);

            const variants = await prisma.variant.findMany({
                where: { id: { in: variantIds } },
                include: {
                    product: {
                        select: {
                            name: true,
                            images: true,
                            category: true,
                            isActive: true,
                            basePrice: true,
                        },
                    },
                },
            });

            const variantMap = new Map(variants.map(v => [v.id, v]));

            // Get low stock threshold from settings (fallback to 5)
            const settingsService = (await import('../services/settingsService.js')).default;
            const lowStockThreshold = Number(await settingsService.getSetting('lowStockThreshold')) || 5;

            return items.map(item => {
                const variant = variantMap.get(item.variantId);
                if (!variant || !variant.product) return null;

                const stockStatus = variant.stock === 0 ? 'out_of_stock' :
                    variant.stock <= lowStockThreshold ? 'low_stock' : 'in_stock';

                const effectivePrice = parseFloat(variant.price) > 0
                    ? parseFloat(variant.price)
                    : parseFloat(variant.product.basePrice);

                return {
                    variant_id: variant.id,
                    product_id: variant.productId,
                    product_name: variant.product.name,
                    sku: variant.sku,
                    quantity: item.quantity,
                    unit_price: effectivePrice,
                    subtotal: parseFloat((effectivePrice * item.quantity).toFixed(2)),
                    stock_available: variant.stock,
                    stock_status: stockStatus,
                    images: (variant.images?.length > 0 ? variant.images : variant.product.images) || [],
                    attributes: {
                        length: variant.length,
                        color: variant.color,
                        texture: variant.texture,
                        size: variant.size,
                    },
                    is_active: variant.isActive && variant.product.isActive,
                    category: variant.product.category?.slug || 'uncategorized',
                };
            }).filter(item => item !== null);
        },
        { type: 'products', swr: true }
    );
};
