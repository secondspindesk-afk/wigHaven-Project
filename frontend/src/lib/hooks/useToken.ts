import { useState, useEffect } from 'react';
import { tokenManager } from '@/lib/utils/tokenManager';

export function useToken() {
    const [token, setToken] = useState(tokenManager.getAccessToken());

    useEffect(() => {
        const handleTokenChange = () => {
            setToken(tokenManager.getAccessToken());
        };

        tokenManager.addEventListener('token-change', handleTokenChange);
        return () => {
            tokenManager.removeEventListener('token-change', handleTokenChange);
        };
    }, []);

    return token;
}
