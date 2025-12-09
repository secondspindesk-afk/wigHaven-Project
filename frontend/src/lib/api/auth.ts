import api from './axios';
import { LoginCredentials, RegisterData, AuthResponse, User, ChangePasswordData } from '../types';

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/login', credentials);
        return response.data;
    },

    async register(data: RegisterData): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    async logout(): Promise<void> {
        await api.post('/auth/logout');
    },

    async getCurrentUser(): Promise<{ success: boolean; data: { user: User } }> {
        const response = await api.get('/auth/me');
        return response.data;
    },

    async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/auth/password-reset/request', { email });
        return response.data;
    },

    async confirmPasswordReset(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/auth/password-reset/confirm', { token, newPassword });
        return response.data;
    },

    async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/auth/verify-email', { token });
        return response.data;
    },

    async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/auth/resend-verification', { email });
        return response.data;
    },

    async changePassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/auth/change-password', data);
        return response.data;
    }
};
