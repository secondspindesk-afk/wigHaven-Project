import api from './axios';

// ==================== TYPES ====================

export interface SystemSettings {
    // Store Information
    siteName: string;
    supportEmail: string;
    supportPhone: string;
    businessAddress: string;
    currency: string;

    // Shipping
    shippingFlatRate: number;
    freeShippingThreshold: number;

    // Payment Methods
    paymentMethods: {
        card: boolean;
        cash: boolean;
        transfer: boolean;
    };
    bankDetails: {
        bankName: string;
        accountNumber: string;
        accountName: string;
    };

    // Social Links
    socialLinks: {
        facebook: string;
        instagram: string;
        twitter: string;
        whatsapp: string;
    };

    // Order Settings
    minOrderAmount: number;
    maxOrderAmount: number;
    orderConfirmationEmail: boolean;

    // Review Settings
    review_auto_approve: boolean;
    minReviewLength: number;
    allowAnonymousReviews: boolean;

    // System
    maintenanceMode: boolean;
    lowStockThreshold: number;
}

// Default settings
const DEFAULT_SETTINGS: SystemSettings = {
    siteName: 'WigHaven',
    supportEmail: 'support@wighaven.com',
    supportPhone: '',
    businessAddress: '',
    currency: 'GHS',
    shippingFlatRate: 25,
    freeShippingThreshold: 500,
    paymentMethods: { card: true, cash: true, transfer: false },
    bankDetails: { bankName: '', accountNumber: '', accountName: '' },
    socialLinks: { facebook: '', instagram: '', twitter: '', whatsapp: '' },
    minOrderAmount: 0,
    maxOrderAmount: 0,
    orderConfirmationEmail: true,
    review_auto_approve: false,
    minReviewLength: 10,
    allowAnonymousReviews: false,
    maintenanceMode: false,
    lowStockThreshold: 5,
};

// Helper to parse stored settings
function parseSettings(data: Record<string, string>): SystemSettings {
    const parseJsonHelper = (value: any, defaultVal: any) => {
        if (typeof value === 'object' && value !== null) return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (e) {
                return defaultVal;
            }
        }
        return defaultVal;
    };

    return {
        // Store Information
        siteName: data.siteName || DEFAULT_SETTINGS.siteName,
        supportEmail: data.supportEmail || DEFAULT_SETTINGS.supportEmail,
        supportPhone: data.supportPhone || DEFAULT_SETTINGS.supportPhone,
        businessAddress: data.businessAddress || DEFAULT_SETTINGS.businessAddress,
        currency: data.currency || DEFAULT_SETTINGS.currency,

        // Shipping
        shippingFlatRate: Number(data.shippingFlatRate) || DEFAULT_SETTINGS.shippingFlatRate,
        freeShippingThreshold: Number(data.freeShippingThreshold) || DEFAULT_SETTINGS.freeShippingThreshold,

        // Payment
        paymentMethods: parseJsonHelper(data.paymentMethods, DEFAULT_SETTINGS.paymentMethods),
        bankDetails: parseJsonHelper(data.bankDetails, DEFAULT_SETTINGS.bankDetails),

        // Social
        socialLinks: parseJsonHelper(data.socialLinks, DEFAULT_SETTINGS.socialLinks),

        // Order Settings
        minOrderAmount: Number(data.minOrderAmount) || DEFAULT_SETTINGS.minOrderAmount,
        maxOrderAmount: Number(data.maxOrderAmount) || DEFAULT_SETTINGS.maxOrderAmount,
        orderConfirmationEmail: data.orderConfirmationEmail === undefined ? DEFAULT_SETTINGS.orderConfirmationEmail : String(data.orderConfirmationEmail) === 'true',

        // Review Settings
        review_auto_approve: String(data.review_auto_approve) === 'true',
        minReviewLength: Number(data.minReviewLength) || DEFAULT_SETTINGS.minReviewLength,
        allowAnonymousReviews: String(data.allowAnonymousReviews) === 'true',

        // System
        maintenanceMode: String(data.maintenanceMode || data.maintenance_mode) === 'true',
        lowStockThreshold: Number(data.lowStockThreshold) || DEFAULT_SETTINGS.lowStockThreshold,
    };
}

// ==================== API FUNCTIONS ====================

export const settingsApi = {
    // Get system settings (Admin route - works for both admin and super_admin)
    getSettings: async (): Promise<SystemSettings> => {
        try {
            const response = await api.get('/admin/settings');
            const data = response.data?.data || response.data || {};
            return parseSettings(data);
        } catch (error) {
            console.warn('Failed to fetch settings, using defaults', error);
            return DEFAULT_SETTINGS;
        }
    },

    // Get public settings (No auth)
    getPublicSettings: async (): Promise<SystemSettings> => {
        try {
            const response = await api.get('/settings/public');
            const data = response.data?.data || response.data || {};
            return parseSettings(data);
        } catch (error) {
            console.warn('Failed to fetch public settings, using defaults', error);
            return DEFAULT_SETTINGS;
        }
    },

    // Update system settings
    updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
        // Update each setting key individually
        const updates: Promise<any>[] = [];

        // Store Information
        if (settings.siteName !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'siteName', value: settings.siteName }));
        }
        if (settings.supportEmail !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'supportEmail', value: settings.supportEmail }));
        }
        if (settings.supportPhone !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'supportPhone', value: settings.supportPhone }));
        }
        if (settings.businessAddress !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'businessAddress', value: settings.businessAddress }));
        }
        if (settings.currency !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'currency', value: settings.currency }));
        }

        // Shipping
        if (settings.shippingFlatRate !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'shippingFlatRate', value: settings.shippingFlatRate }));
        }
        if (settings.freeShippingThreshold !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'freeShippingThreshold', value: settings.freeShippingThreshold }));
        }

        // Payment
        if (settings.paymentMethods !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'paymentMethods', value: JSON.stringify(settings.paymentMethods) }));
        }
        if (settings.bankDetails !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'bankDetails', value: JSON.stringify(settings.bankDetails) }));
        }

        // Social
        if (settings.socialLinks !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'socialLinks', value: JSON.stringify(settings.socialLinks) }));
        }

        // Order Settings
        if (settings.minOrderAmount !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'minOrderAmount', value: settings.minOrderAmount }));
        }
        if (settings.maxOrderAmount !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'maxOrderAmount', value: settings.maxOrderAmount }));
        }
        if (settings.orderConfirmationEmail !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'orderConfirmationEmail', value: String(settings.orderConfirmationEmail) }));
        }

        // Review Settings
        if (settings.review_auto_approve !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'review_auto_approve', value: String(settings.review_auto_approve) }));
        }
        if (settings.minReviewLength !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'minReviewLength', value: settings.minReviewLength }));
        }
        if (settings.allowAnonymousReviews !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'allowAnonymousReviews', value: String(settings.allowAnonymousReviews) }));
        }

        // System
        if (settings.maintenanceMode !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'maintenanceMode', value: String(settings.maintenanceMode) }));
        }
        if (settings.lowStockThreshold !== undefined) {
            updates.push(api.post('/admin/settings', { key: 'lowStockThreshold', value: settings.lowStockThreshold }));
        }

        await Promise.all(updates);

        // Fetch updated settings
        return settingsApi.getSettings();
    }
};

export default settingsApi;

