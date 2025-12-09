import { QueryClient } from '@tanstack/react-query';

/**
 * React Query v5 - Production-Optimized Configuration
 * 
 * Best Practices (2024/2025):
 * - staleTime: How long data is "fresh" (no refetch during this window)
 * - gcTime: How long unused data stays in memory cache
 * - refetchOnWindowFocus: Disabled to reduce server noise
 * - Retry: Smart retry with 503 maintenance mode handling
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data stays fresh for 5 minutes - serves instantly from cache
            staleTime: 5 * 60 * 1000, // 5 minutes

            // Inactive cache kept for 10 minutes before garbage collection
            gcTime: 10 * 60 * 1000, // 10 minutes

            // OPTIMIZATION: Disable refetch on tab focus (reduces server load significantly)
            // Real-time updates already handled by WebSocket notifications
            refetchOnWindowFocus: false,

            // Refetch when internet reconnects (useful for mobile)
            refetchOnReconnect: true,

            // Don't refetch on mount if data is still fresh
            refetchOnMount: true,

            // Smart retry logic - don't retry on client errors or maintenance mode
            retry: (failureCount, error: any) => {
                const status = error?.response?.status;

                // Don't retry on:
                // - 4xx client errors (auth, validation, not found)
                // - 503 Service Unavailable (maintenance mode)
                if (status >= 400 && status < 500) return false;
                if (status === 503) return false;

                // Retry server errors (500, 502, 504) up to 2 times
                return failureCount < 2;
            },

            // Exponential backoff: 1s, 2s, max 30s
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },

        mutations: {
            // Retry mutations once on network failure only
            retry: (failureCount, error: any) => {
                const status = error?.response?.status;
                // Never retry on client errors or maintenance
                if (status >= 400 && status < 500) return false;
                if (status === 503) return false;
                return failureCount < 1;
            },

            // Global mutation error handler
            onError: (error: any) => {
                console.error('Mutation error:', error);
            },
        },
    },
});

