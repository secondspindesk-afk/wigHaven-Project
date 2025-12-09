// Cart Item Attributes
export interface CartItemAttributes {
    length?: string | null;
    color?: string | null;
    texture?: string | null;
    size?: string | null;
}

// Cart Item
export interface CartItem {
    variant_id: string;
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    stock_available: number;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
    images: string[];
    attributes: CartItemAttributes;
    is_active: boolean;
    category: string;
}

// Discount
export interface Discount {
    amount: number;
    code: string | null;
    type?: string;
    value?: number;
}

// Cart
export interface Cart {
    id: string | null;
    items: CartItem[];
    items_count: number;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    discount: Discount;
    couponError?: {
        code: string;
        message: string;
    } | null;
    userId: string | null;
    sessionId: string | null;
    type: 'user' | 'guest';
}

// Validation Issue
export interface ValidationIssue {
    type: 'out_of_stock' | 'insufficient_stock' | 'no_longer_available';
    variant_id: string;
    product_name: string;
    message: string;
    available_quantity?: number;
    requested_quantity?: number;
    action: 'remove_required' | 'reduce_quantity_required';
}

// Cart Validation Response
export interface CartValidation {
    valid: boolean;
    issues: ValidationIssue[];
    cart: Cart;
}

// Add to Cart Request
export interface AddToCartRequest {
    variantId: string;
    quantity: number;
}

// Update Cart Item Request
export interface UpdateCartItemRequest {
    quantity: number;
}

// Apply Coupon Request
export interface ApplyCouponRequest {
    code: string;
}

// Cart API Responses
export interface CartResponse {
    success: boolean;
    data: {
        cart: Cart;
    };
    message?: string;
}

export interface CartValidationResponse {
    success: boolean;
    data: CartValidation;
}
