import { CartItem, Cart } from '@/lib/types/cart';

const CART_STORAGE_KEY = 'wighaven_cart';
const CART_SYNC_KEY = 'wighaven_cart_synced_at';

/**
 * LocalStorage Cart Service
 * 
 * Provides instant cart operations using browser LocalStorage.
 * This is the PRIMARY data source for cart - database sync happens in background.
 * 
 * Architecture (Amazon/Shopify pattern):
 * 1. All reads/writes go to LocalStorage (0ms latency)
 * 2. Background sync pushes changes to database
 * 3. Conflict resolution happens at checkout
 */

export interface LocalCart {
    items: CartItem[];
    couponCode: string | null;
    lastModified: number;
}

/**
 * Get cart from LocalStorage
 */
export const getLocalCart = (): LocalCart => {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('[LocalCart] Failed to parse stored cart:', error);
    }

    return {
        items: [],
        couponCode: null,
        lastModified: Date.now()
    };
};

/**
 * Save cart to LocalStorage
 */
export const saveLocalCart = (cart: LocalCart): void => {
    try {
        cart.lastModified = Date.now();
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.error('[LocalCart] Failed to save cart:', error);
    }
};

/**
 * Add item to local cart (INSTANT)
 */
export const addToLocalCart = (
    variantId: string,
    quantity: number,
    productInfo: Partial<CartItem>
): LocalCart => {
    const cart = getLocalCart();

    const existingIndex = cart.items.findIndex(item => item.variant_id === variantId);

    if (existingIndex >= 0) {
        // Update existing item
        cart.items[existingIndex].quantity += quantity;
        cart.items[existingIndex].subtotal =
            cart.items[existingIndex].quantity * cart.items[existingIndex].unit_price;
    } else {
        // Add new item
        const newItem: CartItem = {
            variant_id: variantId,
            product_id: productInfo.product_id || '',
            product_name: productInfo.product_name || 'Product',
            sku: productInfo.sku || '',
            quantity,
            unit_price: productInfo.unit_price || 0,
            subtotal: quantity * (productInfo.unit_price || 0),
            stock_available: productInfo.stock_available || 0,
            stock_status: productInfo.stock_status || 'in_stock',
            images: productInfo.images || [],
            attributes: productInfo.attributes || {},
            is_active: true,
            category: productInfo.category || 'uncategorized',
        };
        cart.items.push(newItem);
    }

    saveLocalCart(cart);
    return cart;
};

/**
 * Update item quantity in local cart (INSTANT)
 */
export const updateLocalCartItem = (variantId: string, quantity: number): LocalCart => {
    const cart = getLocalCart();

    const itemIndex = cart.items.findIndex(item => item.variant_id === variantId);

    if (itemIndex >= 0) {
        if (quantity <= 0) {
            // Remove item
            cart.items.splice(itemIndex, 1);
        } else {
            // Update quantity
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].subtotal = quantity * cart.items[itemIndex].unit_price;
        }
        saveLocalCart(cart);
    }

    return cart;
};

/**
 * Remove item from local cart (INSTANT)
 */
export const removeFromLocalCart = (variantId: string): LocalCart => {
    const cart = getLocalCart();
    cart.items = cart.items.filter(item => item.variant_id !== variantId);
    saveLocalCart(cart);
    return cart;
};

/**
 * Clear local cart (INSTANT)
 */
export const clearLocalCart = (): void => {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(CART_SYNC_KEY);
};

/**
 * Apply coupon to local cart
 */
export const setLocalCartCoupon = (code: string | null): LocalCart => {
    const cart = getLocalCart();
    cart.couponCode = code;
    saveLocalCart(cart);
    return cart;
};

/**
 * Get last sync timestamp
 */
export const getLastSyncTime = (): number => {
    const stored = localStorage.getItem(CART_SYNC_KEY);
    return stored ? parseInt(stored, 10) : 0;
};

/**
 * Mark cart as synced
 */
export const markCartSynced = (): void => {
    localStorage.setItem(CART_SYNC_KEY, Date.now().toString());
};

/**
 * Check if cart needs sync (modified after last sync)
 */
export const needsSync = (): boolean => {
    const cart = getLocalCart();
    const lastSync = getLastSyncTime();
    return cart.lastModified > lastSync;
};

/**
 * Calculate cart totals (matches backend logic)
 */
export const calculateCartTotals = (items: CartItem[], settings?: any): {
    items_count: number;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
} => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Tax (6.25% - matches backend)
    const taxRate = 0.0625;
    const tax = subtotal * taxRate;

    // Shipping (matches backend defaults)
    const flatRate = settings?.shippingFlatRate ?? 10;
    const threshold = settings?.freeShippingThreshold ?? 100;
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
 * Convert local cart to full Cart object (for React Query)
 */
export const localCartToFullCart = (localCart: LocalCart): Cart => {
    const totals = calculateCartTotals(localCart.items);

    return {
        id: null, // Local cart has no DB ID
        items: localCart.items,
        ...totals,
        discount: { amount: 0, code: localCart.couponCode },
        couponError: null,
        userId: null,
        sessionId: null,
        type: 'guest',
    };
};

export default {
    getLocalCart,
    saveLocalCart,
    addToLocalCart,
    updateLocalCartItem,
    removeFromLocalCart,
    clearLocalCart,
    setLocalCartCoupon,
    getLastSyncTime,
    markCartSynced,
    needsSync,
    calculateCartTotals,
    localCartToFullCart,
};
