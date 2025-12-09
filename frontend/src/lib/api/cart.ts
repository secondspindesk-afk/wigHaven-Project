import axios from './axios';
import type {
    Cart,
    CartResponse,
    CartValidationResponse,
    AddToCartRequest,
    UpdateCartItemRequest,
    ApplyCouponRequest,
} from '@/lib/types/cart';

const CART_BASE = '/cart';

/**
 * Get current cart (guest or user)
 */
export const getCart = async (): Promise<Cart> => {
    const response = await axios.get<CartResponse>(CART_BASE);
    return response.data.data.cart;
};

/**
 * Add item to cart
 */
export const addToCart = async (data: AddToCartRequest): Promise<Cart> => {
    const response = await axios.post<CartResponse>(`${CART_BASE}/items`, data);
    return response.data.data.cart;
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (
    variantId: string,
    data: UpdateCartItemRequest
): Promise<Cart> => {
    const response = await axios.patch<CartResponse>(
        `${CART_BASE}/items/${variantId}`,
        data
    );
    return response.data.data.cart;
};

/**
 * Remove item from cart
 */
export const removeCartItem = async (variantId: string): Promise<Cart> => {
    const response = await axios.delete<CartResponse>(
        `${CART_BASE}/items/${variantId}`
    );
    return response.data.data.cart;
};

/**
 * Clear entire cart
 */
export const clearCart = async (): Promise<void> => {
    await axios.delete(CART_BASE);
};

/**
 * Validate cart (check stock and availability)
 */
export const validateCart = async () => {
    const response = await axios.post<CartValidationResponse>(
        `${CART_BASE}/validate`
    );
    return response.data.data;
};

/**
 * Validate checkout (pre-checkout validation)
 */
export const validateCheckout = async (): Promise<Cart> => {
    const response = await axios.post<CartResponse>(
        `${CART_BASE}/validate-checkout`
    );
    return response.data.data.cart;
};

/**
 * Apply coupon code
 */
export const applyCoupon = async (data: ApplyCouponRequest): Promise<Cart> => {
    const response = await axios.post<CartResponse>(
        `${CART_BASE}/apply-coupon`,
        data
    );
    return response.data.data.cart;
};

/**
 * Remove coupon code
 */
export const removeCoupon = async (): Promise<Cart> => {
    const response = await axios.delete<CartResponse>(
        `${CART_BASE}/remove-coupon`
    );
    return response.data.data.cart;
};

export const cartService = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    validateCart,
    validateCheckout,
    applyCoupon,
    removeCoupon,
};

export default cartService;
