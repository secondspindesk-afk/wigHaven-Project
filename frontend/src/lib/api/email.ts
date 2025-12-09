import api from './axios';
import { EmailPreferences, UpdatePreferencesData } from '@/lib/types/email';

export const emailApi = {
    getPreferences: async () => {
        const response = await api.get<{ data: EmailPreferences }>('/unsubscribe/preferences');
        return response.data.data;
    },

    updatePreferences: async (data: UpdatePreferencesData) => {
        const response = await api.put<{ data: EmailPreferences }>('/unsubscribe/preferences', data);
        return response.data.data;
    },

    unsubscribeAll: async (email: string) => {
        const response = await api.post('/unsubscribe', { email });
        return response.data;
    },
};

export default emailApi;
