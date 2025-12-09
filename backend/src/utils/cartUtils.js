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

    // Tax (6.25% - example rate)
    const taxRate = 0.0625;
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

/**
 * Enrich cart items with product details
 * @param {Array} items - Basic cart items (variantId, quantity)
 * @returns {Promise<Array>} Enriched items
 */
export const enrichCartItems = async (items) => {
    const prisma = getPrisma();
    const variantIds = items.map(item => item.variantId);

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
                    basePrice: true, // Include basePrice for fallback
                },
            },
        },
    });

    const variantMap = new Map(variants.map(v => [v.id, v]));

    return items.map(item => {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
            logger.warn(`[ENRICH] Variant not found for ID: ${item.variantId}`);
            return null; // Item no longer exists
        }

        // Safety check for orphaned variants
        if (!variant.product) {
            logger.error(`[ENRICH] Orphaned variant found: ${variant.id} (Product missing)`);
            return null;
        }

        const stockStatus = variant.stock === 0 ? 'out_of_stock' :
            variant.stock <= 5 ? 'low_stock' : 'in_stock';

        // STANDARD PRICE LOGIC: Fallback to basePrice if variant price is 0
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
            is_active: variant.isActive && variant.product.isActive, // Check both variant and product
            category: variant.product.category?.slug || 'uncategorized', // Null-safe category
        };
    }).filter(item => item !== null); // Remove non-existent items
};
