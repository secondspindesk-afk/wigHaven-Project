import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import adminApi, { AdminSearchResponse } from '../api/admin';

/**
 * Admin Search Hook
 * Provides debounced search across all admin entities
 * 
 * Features:
 * - 300ms debounce to prevent excessive API calls
 * - Minimum 2 character query requirement
 * - Automatic caching via React Query
 * - Loading states for UI feedback
 */
export function useAdminSearch() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Debounce search query to prevent excessive API calls
    const debouncedQuery = useDebounce(query, 300);

    // Fetch search results
    const {
        data,
        isLoading,
        isFetching,
        error
    } = useQuery<AdminSearchResponse>({
        queryKey: ['admin-search', debouncedQuery],
        queryFn: () => adminApi.search(debouncedQuery, 5),
        enabled: debouncedQuery.length >= 2,
        staleTime: 1000 * 60, // Cache for 1 minute
        gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    });

    // Clear search
    const clearSearch = useCallback(() => {
        setQuery('');
    }, []);

    // Open search modal
    const openSearch = useCallback(() => {
        setIsOpen(true);
    }, []);

    // Close search modal
    const closeSearch = useCallback(() => {
        setIsOpen(false);
        setQuery('');
    }, []);

    // Check if we have any results
    const hasResults = data && data.total > 0;

    // Get all results as a flat array (for keyboard navigation)
    const allResults = data ? [
        ...data.results.products,
        ...data.results.orders,
        ...data.results.users,
        ...data.results.reviews,
        ...data.results.categories,
        ...data.results.discounts,
        ...data.results.banners,
        ...data.results.support,
    ] : [];

    return {
        // State
        query,
        setQuery,
        isOpen,
        setIsOpen,

        // Results
        results: data?.results,
        total: data?.total || 0,
        allResults,
        hasResults,

        // Loading
        isLoading: isLoading && debouncedQuery.length >= 2,
        isFetching,

        // Error
        error,

        // Actions
        clearSearch,
        openSearch,
        closeSearch,
    };
}

export default useAdminSearch;
