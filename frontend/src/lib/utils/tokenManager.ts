/**
 * Utility to manage authentication tokens
 * Stores tokens in localStorage for persistence
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
        return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
    }

    getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
    }

    setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = true) {
        const storage = rememberMe ? localStorage : sessionStorage;

        // Clear other storage to avoid duplicates
        const otherStorage = rememberMe ? sessionStorage : localStorage;
        otherStorage.removeItem(ACCESS_TOKEN_KEY);
        otherStorage.removeItem(REFRESH_TOKEN_KEY);

        storage.setItem(ACCESS_TOKEN_KEY, accessToken);
        storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
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
