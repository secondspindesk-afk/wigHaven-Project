import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create a new variant
 * @param {Object} data - Variant data
 * @returns {Promise<Object>} Created variant
 */
export const createVariant = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.create({
            data,
        });
    } catch (error) {
        logger.error('Error creating variant:', error);
        throw error;
    }
};

/**
 * Create multiple variants (Bulk Insert)
 * @param {Array} dataArray - Array of variant data objects
 * @returns {Promise<Object>} Result with count
 */
export const createManyVariants = async (dataArray) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.createMany({
            data: dataArray,
            skipDuplicates: true // Optional: skip if SKU conflict (though we generate unique SKUs)
        });
    } catch (error) {
        logger.error('Error creating multiple variants:', error);
        throw error;
    }
};

/**
 * Find variant by ID
 * @param {string} id - Variant ID
 * @returns {Promise<Object|null>} Variant or null
 */
export const findVariantById = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.findUnique({
            where: { id },
            include: {
                product: true,
            },
        });
    } catch (error) {
        logger.error(`Error finding variant ${id}:`, error);
        throw error;
    }
};

/**
 * Find variant by SKU
 * @param {string} sku - SKU
 * @returns {Promise<Object|null>} Variant or null
 */
export const findVariantBySku = async (sku) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.findUnique({
            where: { sku },
        });
    } catch (error) {
        logger.error(`Error finding variant by SKU ${sku}:`, error);
        throw error;
    }
};

/**
 * Update variant
 * @param {string} id - Variant ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated variant
 */
export const updateVariant = async (id, data) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.update({
            where: { id },
            data,
        });
    } catch (error) {
        logger.error(`Error updating variant ${id}:`, error);
        throw error;
    }
};

/**
 * Hard delete variant - PERMANENTLY removes variant from DB
 * Images are moved to trash (recoverable) before deletion
 * @param {string} id - Variant ID
 * @param {Function} moveImageToTrash - Function to move image to ImageKit trash
 * @returns {Promise<Object>} Deletion result
 */
export const hardDeleteVariant = async (id, moveImageToTrash = null) => {
    try {
        const prisma = getPrisma();

        // 1. Get variant with images
        const variant = await prisma.variant.findUnique({
            where: { id },
            select: { id: true, images: true, productId: true }
        });

        if (!variant) {
            throw new Error('Variant not found');
        }

        // 2. Move images to trash and update Media records
        const imageUrls = variant.images || [];
        if (imageUrls.length > 0) {
            const imagekitUrls = imageUrls.filter(url => url.includes('ik.imagekit.io'));

            if (imagekitUrls.length > 0) {
                // Get media records
                const mediaRecords = await prisma.media.findMany({
                    where: { url: { in: imagekitUrls }, status: 'active' }
                });

                // Move to ImageKit trash (if callback provided)
                if (moveImageToTrash) {
                    for (const media of mediaRecords) {
                        try {
                            await moveImageToTrash(media.fileId, media.filePath);
                        } catch (err) {
                            logger.warn(`Failed to move image to trash: ${media.url}`, err);
                        }
                    }
                }

                // Update Media records
                await prisma.media.updateMany({
                    where: { url: { in: imagekitUrls } },
                    data: {
                        status: 'trashed',
                        trashedAt: new Date(),
                        usedBy: null,
                        usageType: null
                    }
                });
            }
        }

        // 3. Delete the variant
        const deletedVariant = await prisma.variant.delete({
            where: { id }
        });

        logger.info(`Variant ${id} hard deleted. ${imageUrls.length} images moved to trash.`);

        return {
            success: true,
            deletedVariant,
            imagesMovedToTrash: imageUrls.length
        };
    } catch (error) {
        logger.error(`Error hard deleting variant ${id}:`, error);
        throw error;
    }
};

/**
 * Get active variants for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} List of variants
 */
export const getProductVariants = async (productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.findMany({
            where: {
                productId,
                isActive: true,
            },
            orderBy: {
                price: 'asc',
            },
        });
    } catch (error) {
        logger.error(`Error getting variants for product ${productId}:`, error);
        throw error;
    }
};

/**
 * Count active variants for a product
 * @param {string} productId - Product ID
 * @returns {Promise<number>} Count
 */
export const countActiveVariants = async (productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.variant.count({
            where: {
                productId,
                isActive: true,
            },
        });
    } catch (error) {
        logger.error(`Error counting variants for product ${productId}:`, error);
        throw error;
    }
};

/**
 * Find variant by attributes
 * @param {string} productId
 * @param {Object} attributes
 * @returns {Promise<Object|null>} Variant or null
 */
export const findVariantByAttributes = async (productId, { color, length, texture, size }) => {
    try {
        const prisma = getPrisma();
        // Check ALL variants (active and inactive) to prevent conflicts
        // If an inactive variant exists with same attributes and gets restored later,
        // we'd have duplicates. Better to enforce uniqueness across ALL variants.
        return await prisma.variant.findFirst({
            where: {
                productId,
                color: color || null,
                length: length || null,
                texture: texture || null,
                size: size || null,
                // Removed isActive filter - check ALL variants for safety
            }
        });
    } catch (error) {
        logger.error('Error finding variant by attributes:', error);
        throw error;
    }
};

export default {
    createVariant,
    findVariantById,
    findVariantBySku,
    updateVariant,
    hardDeleteVariant,
    getProductVariants,
    countActiveVariants,
    findVariantByAttributes,
    createManyVariants,
};
