/**
 * Utility to manage authentication tokens
 * 
 * IMPORTANT: Always uses localStorage (not sessionStorage) because:
 * - sessionStorage is PER-TAB and not shared between tabs
 * - This would break cross-tab session sharing
 * - The rememberMe flag should only affect server-side token expiry
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class TokenManager extends EventTarget {
    private static instance: TokenManager;

    private constructor() {
        super();
    }

    public static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }
        return TokenManager.instance;
    }

    getAccessToken() {
        // Check both for backwards compatibility during migration
        return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
    }

    getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
    }

    setTokens(accessToken: string, refreshToken: string, _rememberMe: boolean = true) {
        // ALWAYS use localStorage for cross-tab sharing
        // sessionStorage is per-tab and breaks multi-tab functionality

        // Clean up any old sessionStorage tokens
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);

        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        this.dispatchEvent(new Event('token-change'));
    }

    clearTokens() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        this.dispatchEvent(new Event('token-change'));
    }

    hasToken() {
        return !!(localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY));
    }
}

export const tokenManager = TokenManager.getInstance();

