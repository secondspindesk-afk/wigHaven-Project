import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from '@/lib/utils/tokenManager';
import { v4 as uuidv4 } from 'uuid';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Custom event for auth redirect (allows React Router to handle instead of full page reload)
const dispatchAuthRedirect = () => {
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { redirect: '/login' } }));
};

// Session ID management
const getSessionId = () => {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
};

const api = axios.create({
    // Use environment variable if set, otherwise default to relative path (Vite proxy)
    baseURL: import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = tokenManager.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // Also send as custom header to bypass Gateway overwriting Authorization
            config.headers['X-Auth-Token'] = token;
        }

        // Add Session ID to every request
        config.headers['x-session-id'] = getSessionId();

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Handle Rate Limiting (429)
        if (error.response?.status === 429) {
            return Promise.reject(error);
        }

        // Prevent infinite loops
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            // Don't retry/redirect for login requests or /me (maintenance mode logout)
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/me')) {
                // For /me 401, force immediate logout
                if (originalRequest.url?.includes('/auth/me')) {
                    tokenManager.clearTokens();
                    // Use custom event instead of hard redirect
                    dispatchAuthRedirect();
                }
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            // Check if we have tokens at all - if not, user was never logged in
            const refreshToken = tokenManager.getRefreshToken();
            const accessToken = tokenManager.getAccessToken();

            // User was never logged in - don't redirect, just reject
            if (!refreshToken && !accessToken) {
                return Promise.reject(error);
            }

            try {
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Call refresh endpoint
                const response = await axios.post('/api/auth/refresh', { refreshToken });

                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

                // Update tokens
                tokenManager.setTokens(newAccessToken, newRefreshToken);

                // Retry original request with new token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                return api(originalRequest);

            } catch (refreshError) {
                // If refresh fails and we HAD tokens, session expired - logout
                tokenManager.clearTokens();

                // Use custom event instead of hard redirect
                dispatchAuthRedirect();
                return Promise.reject(refreshError);
            }
        }

        // Handle Maintenance Mode (503) - Don't retry, redirect to maintenance page
        if (error.response?.status === 503) {
            const errorData = error.response?.data as any;
            if (errorData?.error === 'MAINTENANCE_MODE') {
                // Clear any pending requests, redirect to a maintenance indication
                // We set a flag in sessionStorage so the app can show a maintenance banner
                sessionStorage.setItem('maintenanceMode', 'true');

                // Only redirect once (prevent multiple redirects)
                if (!window.location.pathname.includes('/maintenance') && !sessionStorage.getItem('maintenanceRedirecting')) {
                    sessionStorage.setItem('maintenanceRedirecting', 'true');
                    // For now, just show an alert and stop. A full maintenance page would be better.
                    console.warn('[MAINTENANCE MODE] Site is under maintenance. Stopping requests.');
                    // Clear the flag after a short delay to allow re-check
                    setTimeout(() => sessionStorage.removeItem('maintenanceRedirecting'), 5000);
                }
            }
            // Don't retry 503 errors
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default api;

