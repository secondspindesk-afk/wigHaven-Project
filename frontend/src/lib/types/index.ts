import { Product } from './product';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'customer' | 'admin' | 'super_admin';
    phone?: string;
    avatar?: string;
    emailVerified: boolean;
    createdAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
}

export interface AuthResponse {
    success: boolean;
    data: {
        user: User;
        accessToken: string;
        refreshToken: string;
    };
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
    confirmPassword?: string;
}

export interface Address {
    id: string;
    userId: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAddressData {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    isDefault?: boolean;
}

export interface UpdateAddressData extends Partial<CreateAddressData> { }

export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export interface OrderItem {
    id: string;
    order_id?: string; // Optional or mapped? Backend doesn't explicitly return it in items map
    product_id?: string;
    variant_id?: string;
    product_name: string;
    variant_sku: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    product_image?: string;
    variant_details?: {
        color?: string;
        length?: string;
        texture?: string;
        size?: string;
    };
}

export interface Order {
    id: string;
    order_number: string;
    user_id: string;
    customer_email: string;
    customer_phone?: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    subtotal: number;
    tax: number;
    shipping: number;
    discount_amount: number;
    coupon_code?: string;
    total: number;
    shipping_address: Address;
    billing_address?: Address;
    items: OrderItem[];
    created_at: string;
    updated_at: string;
    tracking_number?: string;
    carrier?: string;
    paystack_reference?: string;
    notes?: string;
}

export interface WishlistItem {
    id: string;
    userId: string;
    productId: string;
    product: Product;
    createdAt: string;
}
