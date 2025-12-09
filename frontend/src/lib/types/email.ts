export interface EmailPreferences {
    id: string;
    userId: string;
    email: string;
    marketingEmails: boolean;
    abandonedCartEmails: boolean;
    backInStockEmails: boolean;
    unsubscribedFromAll: boolean;
    updatedAt: string;
}

export interface UpdatePreferencesData {
    marketingEmails: boolean;
    abandonedCartEmails: boolean;
    backInStockEmails: boolean;
}
