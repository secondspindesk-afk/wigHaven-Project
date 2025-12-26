import categoryRepository from '../db/repositories/categoryRepository.js';
import { getPrisma } from '../config/database.js';
import adminBroadcast from '../utils/adminBroadcast.js';
import smartCache from '../utils/smartCache.js';
import logger from '../utils/logger.js';

/**
 * Generate slug from name
 */
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-');         // Replace multiple hyphens with single
};

/**
 * Create category
 */
const createCategory = async (data) => {
    // Generate slug from name if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check if slug exists
    const existingSlug = await categoryRepository.findCategoryBySlug(slug);
    if (existingSlug) {
        throw new Error('A category with this name already exists');
    }

    // Check if name exists
    const existingName = await categoryRepository.findCategoryByName(data.name);
    if (existingName) {
        throw new Error('A category with this name already exists');
    }

    // Validate image if present (only for ImageKit URLs)
    if (data.image && data.image.includes('ik.imagekit.io')) {
        const prisma = getPrisma();
        // Strip query parameters for media lookup (cache-busting params like ?v=...)
        const imageUrlWithoutParams = data.image.split('?')[0];

        const media = await prisma.media.findFirst({
            where: {
                url: imageUrlWithoutParams,
                status: 'active'
            }
        });

        if (!media) {
            throw new Error(`Invalid image URL: ${data.image}`);
        }
    }

    // Add slug to data
    const categoryData = { ...data, slug };
    const category = await categoryRepository.createCategory(categoryData);

    // Link media record
    if (data.image && data.image.includes('ik.imagekit.io')) {
        const prisma = getPrisma();
        // Strip query parameters for media update
        const imageUrlWithoutParams = data.image.split('?')[0];
        await prisma.media.updateMany({
            where: { url: imageUrlWithoutParams },
            data: {
                usedBy: category.id,
                usageType: 'category_image'
            }
        });
    }

    // Invalidate caches
    await adminBroadcast.notifyCategoriesChanged();

    return category;
};

/**
 * Get all categories
 * SMART CACHED: 24 hour TTL, invalidated on admin change via WebSocket
 */
const getCategories = async (params) => {
    // Generate cache key based on params
    const cacheKey = params ? `categories:list:${JSON.stringify(params)}` : smartCache.keys.categories();

    return smartCache.getOrFetch(
        cacheKey,
        () => categoryRepository.getCategories(params),
        { type: 'categories', swr: true }
    );
};

/**
 * Get category by ID
 */
const getCategoryById = async (id) => {
    return smartCache.getOrFetch(
        smartCache.keys.category(id),
        () => categoryRepository.findCategoryById(id),
        { type: 'categories', swr: true }
    );
};

/**
 * Update category
 */
const updateCategory = async (id, data) => {
    // ============================================
    // FRONTEND-DRIVEN OPTIMIZATION
    // ============================================
    const frontendChangedFields = data._changedFields;
    delete data._changedFields;

    // Skip if no changes reported
    if (frontendChangedFields && frontendChangedFields.length === 0) {
        logger.info(`[PERF] No changes reported for category ${id}, skipping update`);
        return await categoryRepository.findCategoryById(id);
    }

    // If updating slug, check uniqueness
    if (data.slug) {
        const existingSlug = await categoryRepository.findCategoryBySlug(data.slug);
        if (existingSlug && existingSlug.id !== id) {
            throw new Error('Slug already exists');
        }
    }

    // Handle image update (only if image field changed)
    const shouldProcessImage = !frontendChangedFields || frontendChangedFields.includes('image');
    if (data.image && shouldProcessImage) {
        const prisma = getPrisma();

        // Only validate ImageKit URLs against media table
        const isImageKitUrl = data.image.includes('ik.imagekit.io');

        if (isImageKitUrl) {
            const imageUrlWithoutParams = data.image.split('?')[0];

            // 1. Validate new image exists
            const media = await prisma.media.findFirst({
                where: {
                    url: imageUrlWithoutParams,
                    status: 'active'
                }
            });

            if (!media) {
                throw new Error(`Invalid image URL: ${data.image}`);
            }

            // 2. Unlink old image
            await prisma.media.updateMany({
                where: {
                    usedBy: id,
                    usageType: 'category_image'
                },
                data: {
                    usedBy: null,
                    usageType: null
                }
            });

            // 3. Link new image
            await prisma.media.updateMany({
                where: { url: imageUrlWithoutParams },
                data: {
                    usedBy: id,
                    usageType: 'category_image'
                }
            });
        }
    }

    const updatedCategory = await categoryRepository.updateCategory(id, data);

    // Conditional cache invalidation - only if public-facing fields changed
    const publicFields = ['name', 'slug', 'description', 'image', 'isActive', 'isFeatured'];
    const hasPublicChanges = !frontendChangedFields || frontendChangedFields.some(f => publicFields.includes(f));

    if (hasPublicChanges) {
        await adminBroadcast.notifyCategoriesChanged();
    } else {
        logger.info(`[PERF] Skipping category cache invalidation - no public changes`);
    }

    return updatedCategory;
};

/**
 * Delete category
 * @param {string} id - Category ID to delete
 * @param {string} [transferToId] - Optional category ID to transfer products to
 */
const deleteCategory = async (id, transferToId) => {
    const prisma = getPrisma();

    // If transferToId is provided, move products first
    if (transferToId) {
        // Verify target category exists
        const targetCategory = await categoryRepository.findCategoryById(transferToId);
        if (!targetCategory) {
            throw new Error('Target category for transfer not found');
        }

        // Move products
        await prisma.product.updateMany({
            where: { categoryId: id },
            data: { categoryId: transferToId }
        });

        logger.info(`Transferred products from category ${id} to ${transferToId}`);
    } else {
        // Check if there are products remaining
        const productCount = await prisma.product.count({
            where: { categoryId: id }
        });

        if (productCount > 0) {
            throw new Error('Cannot delete category with associated products. Please transfer them first.');
        }
    }

    const result = await categoryRepository.deleteCategory(id);

    // Invalidate caches
    await adminBroadcast.notifyCategoriesChanged();

    return result;
};

export default {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
