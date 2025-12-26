import { useState, useEffect } from 'react';
import { tokenManager } from '@/lib/utils/tokenManager';

export function useToken() {
    const [token, setToken] = useState(tokenManager.getAccessToken());

    useEffect(() => {
        const handleTokenChange = () => {
            setToken(tokenManager.getAccessToken());
        };

        // Listen for token changes in THIS tab
        tokenManager.addEventListener('token-change', handleTokenChange);

        // Listen for localStorage changes from OTHER tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'access_token' || e.key === null) {
                // e.key is null when localStorage.clear() is called
                setToken(tokenManager.getAccessToken());
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            tokenManager.removeEventListener('token-change', handleTokenChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return token;
}

