import categoryRepository from '../db/repositories/categoryRepository.js';
import { getPrisma } from '../config/database.js';
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
        const media = await prisma.media.findFirst({
            where: {
                url: data.image,
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
        await prisma.media.updateMany({
            where: { url: data.image },
            data: {
                usedBy: category.id,
                usageType: 'category_image'
            }
        });
    }

    return category;
};

/**
 * Get all categories
 */
const getCategories = async (params) => {
    return await categoryRepository.getCategories(params);
};

/**
 * Get category by ID
 */
const getCategoryById = async (id) => {
    return await categoryRepository.findCategoryById(id);
};

/**
 * Update category
 */
const updateCategory = async (id, data) => {
    // If updating slug, check uniqueness
    if (data.slug) {
        const existingSlug = await categoryRepository.findCategoryBySlug(data.slug);
        if (existingSlug && existingSlug.id !== id) {
            throw new Error('Slug already exists');
        }
    }

    // Handle image update
    if (data.image) {
        const prisma = getPrisma();

        // Only validate ImageKit URLs against media table
        // External URLs (like Unsplash) are allowed directly
        const isImageKitUrl = data.image.includes('ik.imagekit.io');

        if (isImageKitUrl) {
            // 1. Validate new image exists in media table
            const media = await prisma.media.findFirst({
                where: {
                    url: data.image,
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
                where: { url: data.image },
                data: {
                    usedBy: id,
                    usageType: 'category_image'
                }
            });
        }
        // External URLs are allowed without media table validation
    }

    return await categoryRepository.updateCategory(id, data);
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

    return await categoryRepository.deleteCategory(id);
};

export default {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
