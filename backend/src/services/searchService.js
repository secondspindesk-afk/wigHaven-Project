import productRepository from '../db/repositories/productRepository.js';
import logger from '../utils/logger.js';

/**
 * Search products
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @returns {Promise<Object>} Search results
 */
export const searchProducts = async (query, page = 1) => {
    try {
        // Use listProducts with search parameter (PostgreSQL ILIKE for case-insensitive search)
        const results = await productRepository.listProducts({
            page,
            limit: 20,
            search: query,
            isAdmin: false  // Only active products in public search
        });

        return {
            products: results.products,
            page: results.currentPage,
            limit: 20,
            total: results.total
        };
    } catch (error) {
        logger.error('Search service error:', error);
        throw error;
    }
};

export default {
    searchProducts,
};
