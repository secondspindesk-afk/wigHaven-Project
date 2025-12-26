import productRepository from '../db/repositories/productRepository.js';
import variantRepository from '../db/repositories/variantRepository.js';
import categoryRepository from '../db/repositories/categoryRepository.js';
import logger from '../utils/logger.js';
import { getPrisma } from '../config/database.js';
import { uploadFromUrl } from '../config/imagekit.js';
import { generateUniqueFilename, getFolderPath, validateExternalImageUrl } from '../utils/imageUtils.js';
import smartCache from '../utils/smartCache.js';
import adminBroadcast from '../utils/adminBroadcast.js';

/**
 * Invalidate all product-related caches
 * @deprecated Use adminBroadcast.notifyProductsChanged() instead
 */
const invalidateProductCache = async (productId = null, action = 'update', metadata = {}) => {
    await adminBroadcast.notifyProductsChanged({ productId, action, ...metadata });
};

/**
 * Process image URLs - uploads external URLs to ImageKit and returns all as ImageKit URLs
 * This ensures ALL images are stored in ImageKit for consistent caching and CDN benefits
 * @param {string[]} imageUrls - Array of image URLs (can be ImageKit or external)
 * @param {string} type - Image type for folder organization (variant, product, etc.)
 * @param {string} userId - User ID for tracking in Media table
 * @param {object} tx - Optional Prisma transaction client for atomic operations
 * @returns {Promise<string[]>} - Array of ImageKit URLs only
 */
const processImageUrls = async (imageUrls, type = 'variant', userId = null, tx = null) => {
    if (!imageUrls || imageUrls.length === 0) {
        return [];
    }

    // Use transaction client if provided, otherwise get default prisma
    const prisma = tx || getPrisma();

    // Process all URLs in parallel for maximum performance
    return Promise.all(imageUrls.map(async (url) => {
        // If already ImageKit URL, just verify it exists in Media
        if (url.includes('ik.imagekit.io')) {
            // Strip query parameters for Media table lookup
            const urlWithoutParams = url.split('?')[0];

            const mediaRecord = await prisma.media.findFirst({
                where: { url: urlWithoutParams, status: { not: 'deleted' } }
            });

            if (mediaRecord) {
                return url;
            } else {
                logger.warn(`ImageKit URL not found in Media table: ${urlWithoutParams}`);
                throw new Error(`Invalid ImageKit URL: ${url}. Please upload the image first.`);
            }
        } else {
            // External URL - upload to ImageKit
            try {
                // Validate external URL
                const validation = validateExternalImageUrl(url);
                if (!validation.valid) {
                    throw new Error(`Invalid external URL ${url}: ${validation.error}`);
                }

                // Extract filename and determine folder
                const urlParts = new URL(url);
                const urlFileName = urlParts.pathname.split('/').pop() || 'image.jpg';
                const fileName = generateUniqueFilename(urlFileName, type);
                const folder = getFolderPath(type);

                // Upload to ImageKit
                logger.info(`Auto-uploading external URL to ImageKit: ${url}`);
                const uploadResult = await uploadFromUrl(url, fileName, folder);

                // Save to Media table (using tx if available)
                await prisma.media.create({
                    data: {
                        fileId: uploadResult.fileId,
                        fileName: uploadResult.name,
                        filePath: uploadResult.filePath,
                        url: uploadResult.url,
                        fileHash: null,
                        type,
                        mimeType: uploadResult.fileType || 'image/jpeg',
                        size: uploadResult.size || 0,
                        width: uploadResult.width,
                        height: uploadResult.height,
                        uploadedBy: userId || 'system',
                        status: 'active'
                    }
                });

                logger.info(`External URL uploaded to ImageKit: ${url} → ${uploadResult.url}`);
                return uploadResult.url;
            } catch (error) {
                logger.error(`Failed to upload external URL ${url}:`, error);
                throw new Error(`Failed to process image URL ${url}: ${error.message}`);
            }
        }
    }));
};


/**
 * Create product with default variant
 * ARCHITECTURE: All images go to variants[0] (main variant), product.images is DEPRECATED
 * All external URLs are auto-uploaded to ImageKit for consistent CDN/caching
 * TRANSACTIONAL: Product + Variants + Media are created atomically
 */
export const createProduct = async (productData, userId = null) => {
    try {
        // Convert snake_case to camelCase for internal processing
        if (productData.base_price !== undefined) {
            productData.basePrice = productData.base_price;
            delete productData.base_price;
        }
        if (productData.category_id !== undefined) {
            productData.categoryId = productData.category_id;
            delete productData.category_id;
        }
        if (productData.is_active !== undefined) {
            productData.isActive = productData.is_active;
            delete productData.is_active;
        }
        if (productData.is_featured !== undefined) {
            productData.isFeatured = productData.is_featured;
            delete productData.is_featured;
        }

        // VALIDATION: Price must be greater than 0
        if (productData.basePrice !== undefined && productData.basePrice <= 0) {
            throw new Error('Product price must be greater than 0');
        }

        // 1. Resolve category - accepts either categoryId directly OR category slug
        if (productData.categoryId) {
            // categoryId provided directly - verify it exists
            const category = await categoryRepository.findCategoryById(productData.categoryId);
            if (!category) {
                throw new Error(`Category with ID '${productData.categoryId}' not found`);
            }
        } else if (productData.category) {
            // Category slug provided - resolve to ID
            const category = await categoryRepository.findCategoryBySlug(productData.category);
            if (!category) {
                throw new Error(`Category '${productData.category}' not found`);
            }
            productData.categoryId = category.id;
            delete productData.category; // Remove slug from data
        } else {
            throw new Error('Category is required');
        }

        // 2. Process images BEFORE transaction (external API calls should not be in tx)
        // Note: If variants are provided, these top-level images are assigned to the first variant
        const inputImages = productData.images || [];
        const topLevelImages = await processImageUrls(inputImages, 'variant', userId);
        logger.info(`Processed ${inputImages.length} images → ${topLevelImages.length} ImageKit URLs`);

        const prisma = getPrisma();

        // 3. Prepare clean product data
        const productDataClean = { ...productData };
        delete productDataClean.images;
        delete productDataClean.variants; // Remove variants to handle them manually
        productDataClean.images = []; // Set empty array for product.images (deprecated)

        // ============================================
        // ATOMIC TRANSACTION: Product + Variants + Media
        // ============================================
        const result = await prisma.$transaction(async (tx) => {
            // Create product
            const product = await tx.product.create({
                data: {
                    name: productDataClean.name,
                    description: productDataClean.description || '',
                    basePrice: productDataClean.basePrice,
                    categoryId: productDataClean.categoryId,
                    isActive: productDataClean.isActive ?? true,
                    isFeatured: productDataClean.isFeatured ?? false,
                    images: [],
                },
                include: { category: true }
            });

            // Create Variants
            if (productData.variants && productData.variants.length > 0) {
                // Case A: Variants provided in request
                for (const variant of productData.variants) {
                    // Process variant images (already processed or use top-level)
                    const variantInputImages = variant.images || [];
                    const imagesToProcess = (variantInputImages.length === 0 && productData.variants.indexOf(variant) === 0)
                        ? topLevelImages
                        : variantInputImages;

                    // If variant has new external images, process them (using tx for media records)
                    const processedVariantImages = imagesToProcess.length > 0 && !imagesToProcess[0]?.includes?.('ik.imagekit.io')
                        ? await processImageUrls(imagesToProcess, 'variant', userId, tx)
                        : imagesToProcess;

                    const createdVariant = await tx.variant.create({
                        data: {
                            productId: product.id,
                            sku: variant.sku || `${product.id.slice(-6).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                            price: (variant.price && variant.price > 0) ? variant.price : product.basePrice,
                            stock: variant.stock !== undefined ? variant.stock : 0,
                            color: variant.color || '',
                            length: variant.length || '',
                            texture: variant.texture || '',
                            size: variant.size || '',
                            images: processedVariantImages,
                            isActive: variant.isActive ?? variant.is_active ?? true,
                        }
                    });

                    // Link media records
                    if (processedVariantImages.length > 0) {
                        const urlsWithoutParams = processedVariantImages.map(url => url.split('?')[0]);
                        await tx.media.updateMany({
                            where: { url: { in: urlsWithoutParams } },
                            data: {
                                usedBy: createdVariant.id,
                                usageType: 'variant_image'
                            }
                        });
                    }
                }
            } else {
                // Case B: No variants provided - Create default variant
                const defaultVariant = await tx.variant.create({
                    data: {
                        productId: product.id,
                        sku: `${product.id.slice(-6).toUpperCase()}-DEFAULT`,
                        price: product.basePrice,
                        stock: 0,
                        images: topLevelImages,
                        isActive: true,
                    }
                });

                // Link media records
                if (topLevelImages.length > 0) {
                    const urlsWithoutParams = topLevelImages.map(url => url.split('?')[0]);
                    await tx.media.updateMany({
                        where: { url: { in: urlsWithoutParams } },
                        data: {
                            usedBy: defaultVariant.id,
                            usageType: 'variant_image'
                        }
                    });
                }
            }

            return product;
        }, { timeout: 15000 }); // 15s timeout for complex operations

        // Fetch full product with variants for return
        const fullProduct = await productRepository.findProductById(result.id);
        await invalidateProductCache(result.id, 'create');

        logger.info(`[TX] Product ${result.id} created atomically with variants`);
        return fullProduct;
    } catch (error) {
        logger.error('Error in createProduct service:', error);
        throw error;
    }

};

/**
 * Fetch product from database and calculate stats (internal helper)
 */
const fetchProductFromDB = async (id) => {
    const product = await productRepository.findProductById(id);

    if (!product) {
        return null;
    }

    // Calculate stats
    const variants = product.variants || [];
    const stats = {
        total_variants: variants.length,
        in_stock: variants.filter(v => v.stock > 5).length,
        low_stock: variants.filter(v => v.stock > 0 && v.stock <= 5).length,
        out_of_stock: variants.filter(v => v.stock === 0).length,
    };

    return { ...product, stats };
};

/**
 * Get product by ID - SMART CACHED
 * 
 * Features:
 * - Request deduplication (concurrent requests share one DB call)
 * - SWR (stale-while-revalidate) for instant responses
 * - 5 minute TTL
 */
export const getProductById = async (id) => {
    return smartCache.getOrFetch(
        smartCache.keys.product(id),
        () => fetchProductFromDB(id),
        { type: 'product', swr: true }
    );
};

/**
 * Get Admin Product by ID (Includes inactive variants & transforms data)
 */
export const getAdminProductById = async (id) => {
    try {
        // 1. Fetch product with ALL variants (active & inactive)
        const product = await productRepository.findProductById(id, true, true); // id, includeVariants, isAdmin

        if (!product) return null;

        // DEBUG: Log images to trace
        logger.info(`[DEBUG] getAdminProductById images: ${JSON.stringify(product.images)}`);
        logger.info(`[DEBUG] getAdminProductById variant count: ${product.variants?.length}, first variant images: ${JSON.stringify(product.variants?.[0]?.images)}`);

        // 2. Transform data (Main vs Sub variants)
        const allVariants = product.variants || [];
        const hasVariants = allVariants.length > 0;
        const mainVariant = hasVariants ? allVariants[0] : null;
        const subVariants = hasVariants ? allVariants.slice(1) : [];

        return {
            ...product,
            variantData: {
                mainVariant,
                subVariants,
                allVariants,
                hasVariants,
                count: allVariants.length
            }
        };
    } catch (error) {
        logger.error(`Error in getAdminProductById service for ${id}:`, error);
        throw error;
    }
};

/**
 * List products - SMART CACHED
 * 
 * Features:
 * - Query-based cache key (hash of params)
 * - Request deduplication (concurrent same-query requests share one DB call)
 * - SWR (stale-while-revalidate) for instant responses
 * - 2 minute TTL (shorter due to product data volatility)
 */
export const listProducts = async (params) => {
    return smartCache.getOrFetch(
        smartCache.keys.productList(params),
        () => productRepository.listProducts(params),
        { type: 'productList', swr: true }
    );
};

/**
 * Update product
 * ARCHITECTURE: Images are routed to variants[0] (main variant). product.images is DEPRECATED.
 * Supports single-field updates - only provided fields are updated.
 */
export const updateProduct = async (id, data, userId = null) => {
    try {
        const prisma = getPrisma();

        // Fetch existing product for basePrice fallback
        const existingProduct = await productRepository.findProductById(id);
        if (!existingProduct) {
            throw new Error('Product not found');
        }

        // Convert snake_case to camelCase for Prisma compatibility
        if (data.base_price !== undefined) {
            data.basePrice = data.base_price;
            delete data.base_price;
        }
        if (data.category_id !== undefined) {
            data.categoryId = data.category_id;
            delete data.category_id;
        }
        if (data.is_active !== undefined) {
            data.isActive = data.is_active;
            delete data.is_active;
        }
        if (data.is_featured !== undefined) {
            data.isFeatured = data.is_featured;
            delete data.is_featured;
        }

        // VALIDATION: Price must be greater than 0 (only if provided)
        if (data.basePrice !== undefined && data.basePrice <= 0) {
            throw new Error('Product price must be greater than 0');
        }

        // Resolve category slug if provided
        if (data.category) {
            const category = await categoryRepository.findCategoryBySlug(data.category);
            if (!category) {
                throw new Error(`Category '${data.category}' not found`);
            }
            data.categoryId = category.id;
            delete data.category;
        }

        // IGNORE data.images (deprecated top-level field)
        if (data.images) {
            delete data.images;
        }

        // ============================================
        // FRONTEND-DRIVEN OPTIMIZATION
        // If frontend sends _changedFields, trust it completely
        // ============================================
        const frontendChangedFields = data._changedFields;
        delete data._changedFields; // Remove directive before DB update

        if (frontendChangedFields && Array.isArray(frontendChangedFields)) {
            logger.info(`[PERF] Frontend reported changed fields: [${frontendChangedFields.join(', ')}]`);

            // SUPER FAST PATH: No changes at all
            if (frontendChangedFields.length === 0) {
                logger.info(`[PERF] No changes reported by frontend, skipping update for ${id}`);
                return existingProduct;
            }

            // FAST PATH: Only product-level fields changed (no variants)
            const hasVariantsInChange = frontendChangedFields.includes('variants');
            if (!hasVariantsInChange) {
                // Remove variants from data if present
                delete data.variants;

                logger.info(`[PERF] Frontend fast-path: updating only [${frontendChangedFields.join(', ')}] for product ${id}`);

                const updatedProduct = await prisma.product.update({
                    where: { id },
                    data,
                    include: { category: true }
                });

                // Only invalidate if public-facing fields changed
                const publicFields = ['name', 'description', 'basePrice', 'categoryId', 'isActive', 'isFeatured'];
                const hasPublicChanges = frontendChangedFields.some(f => publicFields.includes(f));

                if (hasPublicChanges) {
                    const categoryIdChanged = frontendChangedFields.includes('categoryId');
                    await invalidateProductCache(id, 'update', { categoryIdChanged });
                } else {
                    logger.info(`[PERF] Skipping cache invalidation - no public-facing changes`);
                }

                return updatedProduct;
            }
        }

        // ============================================
        // SMART VARIANT CHANGE DETECTION
        // Check if variants actually have modifications (not just existence)
        // ============================================
        const existingVariantIds = existingProduct.variants?.map(v => v.id) || [];
        const existingVariantMap = new Map(existingProduct.variants?.map(v => [v.id, v]) || []);

        const hasActualVariantChanges = (() => {
            if (!data.variants || !Array.isArray(data.variants) || data.variants.length === 0) {
                return false;
            }

            // Check for new variants (no ID)
            if (data.variants.some(v => !v.id)) {
                logger.info(`[PERF] New variant detected, using slow path`);
                return true;
            }

            // Check each variant for actual changes
            for (const variant of data.variants) {
                const existing = existingVariantMap.get(variant.id);
                if (!existing) {
                    logger.info(`[PERF] Unknown variant ID ${variant.id}, using slow path`);
                    return true;
                }

                // Compare fields that matter
                const fieldsToCheck = ['sku', 'price', 'stock', 'color', 'length', 'texture', 'size', 'isActive', 'is_active'];
                for (const field of fieldsToCheck) {
                    if (variant[field] !== undefined) {
                        const existingValue = field === 'is_active' ? existing.isActive : existing[field];
                        const newValue = variant[field];
                        if (existingValue !== newValue) {
                            logger.info(`[PERF] Variant ${variant.id} has changed field: ${field}`);
                            return true;
                        }
                    }
                }

                // Check if images changed (compare arrays)
                if (variant.images !== undefined) {
                    const existingImages = JSON.stringify(existing.images || []);
                    const newImages = JSON.stringify(variant.images || []);
                    if (existingImages !== newImages) {
                        logger.info(`[PERF] Variant ${variant.id} has changed images`);
                        return true;
                    }
                }
            }

            return false;
        })();

        // ============================================
        // FAST PATH: No actual variant changes
        // ============================================
        if (!hasActualVariantChanges) {
            // Remove variants key to avoid Prisma error
            delete data.variants;

            logger.info(`[PERF] Fast-path update for product ${id} (no variant changes detected)`);

            const updatedProduct = await prisma.product.update({
                where: { id },
                data,
                include: { category: true }
            });

            const categoryIdChanged = data.categoryId !== undefined &&
                data.categoryId !== existingProduct.categoryId;
            await invalidateProductCache(id, 'update', { categoryIdChanged });

            return updatedProduct;
        }

        // ============================================
        // SLOW PATH: Full transaction for actual variant changes
        // ============================================
        logger.info(`[PERF] Full transaction update for product ${id} with ${data.variants.length} variants`);

        // --- START OPTIMIZED PROCESSING ---
        const updateActions = async (tx) => {
            // Handle variant updates (for explicit variant array in request)
            if (data.variants && Array.isArray(data.variants)) {
                logger.info(`[PERF] Starting parallel processing for ${data.variants.length} variants of product ${id}`);

                // 1. Process variants in parallel
                await Promise.all(data.variants.map(async (variant) => {
                    const existingVariant = existingVariantMap.get(variant.id);

                    // OPTIMIZATION: Skip image processing if images haven't changed
                    let processedImages = variant.images || [];
                    if (variant.images && variant.images.length > 0) {
                        const existingImages = JSON.stringify(existingVariant?.images || []);
                        const newImages = JSON.stringify(variant.images);

                        if (existingImages === newImages) {
                            // Images unchanged - skip expensive processing
                            logger.info(`[PERF] Skipping image processing for variant ${variant.id} (unchanged)`);
                            processedImages = variant.images;
                        } else {
                            // Images changed - process them
                            try {
                                processedImages = await processImageUrls(variant.images, 'variant', userId);
                            } catch (imgError) {
                                logger.error(`Failed to process images for variant ${variant.id || 'new'}:`, imgError);
                            }
                        }
                    }

                    if (variant.id) {
                        // Build update object (partial update)
                        const updateData = {};
                        if (variant.sku !== undefined) updateData.sku = variant.sku;
                        if (variant.price !== undefined) updateData.price = variant.price;
                        if (variant.stock !== undefined) updateData.stock = variant.stock;
                        if (variant.color !== undefined) updateData.color = variant.color || null;
                        if (variant.length !== undefined) updateData.length = variant.length || null;
                        if (variant.texture !== undefined) updateData.texture = variant.texture || null;
                        if (variant.size !== undefined) updateData.size = variant.size || null;

                        if (variant.images !== undefined) {
                            updateData.images = processedImages;
                        }

                        if (variant.isActive !== undefined || variant.is_active !== undefined) {
                            updateData.isActive = variant.is_active ?? variant.isActive;
                        }

                        // Update existing variant
                        if (Object.keys(updateData).length > 0) {
                            await tx.variant.update({
                                where: { id: variant.id },
                                data: updateData
                            });

                            // Link Media records if images were updated
                            if (updateData.images && updateData.images.length > 0) {
                                const urlsWithoutParams = updateData.images.map(url => url.split('?')[0]);

                                // Unlink old images
                                await tx.media.updateMany({
                                    where: { usedBy: variant.id, usageType: 'variant_image' },
                                    data: { usedBy: null, usageType: null }
                                });

                                // Link new images
                                await tx.media.updateMany({
                                    where: { url: { in: urlsWithoutParams } },
                                    data: { usedBy: variant.id, usageType: 'variant_image' }
                                });
                            }
                        }
                    } else {
                        // Create new variant
                        if (!variant.sku) throw new Error('New variants require sku');

                        const newVariant = await tx.variant.create({
                            data: {
                                productId: id,
                                sku: variant.sku,
                                price: (variant.price && variant.price > 0) ? variant.price : existingProduct.basePrice,
                                stock: variant.stock || 0,
                                color: variant.color || null,
                                length: variant.length || null,
                                texture: variant.texture || null,
                                size: variant.size || null,
                                images: processedImages,
                                isActive: variant.is_active ?? variant.isActive ?? true
                            }
                        });

                        // Link Media records
                        if (processedImages.length > 0) {
                            const urlsWithoutParams = processedImages.map(url => url.split('?')[0]);
                            await tx.media.updateMany({
                                where: { url: { in: urlsWithoutParams } },
                                data: { usedBy: newVariant.id, usageType: 'variant_image' }
                            });
                        }
                    }
                }));

                // Remove variants from data so it doesn't try to update them as a top-level product field
                delete data.variants;
            }

            // 2. Final Product update
            return await tx.product.update({
                where: { id },
                data,
                include: { category: true }
            });
        };

        // Execute as a single transaction for speed and consistency
        const updatedProduct = await prisma.$transaction(updateActions);

        // INVALIDATE ALL PRODUCT CACHES
        const categoryIdChanged = data.categoryId !== undefined && data.categoryId !== existingProduct.categoryId;
        await invalidateProductCache(id, 'update', { categoryIdChanged });

        return updatedProduct;
    } catch (error) {
        logger.error(`Error in updateProduct service for ${id}:`, error);
        throw error;
    }
};

/**
 * Delete product - PERMANENTLY removes from DB
 * Images are moved to ImageKit trash (recoverable for 30 days)
 */
export const deleteProduct = async (id) => {
    try {
        // Import moveToTrash from imagekit config
        const { moveToTrash } = await import('../config/imagekit.js');

        const result = await productRepository.hardDeleteProduct(id, moveToTrash);
        logger.info(`Product ${id} deleted. ${result.imagesMovedToTrash} images moved to trash.`);

        // INVALIDATE ALL PRODUCT CACHES
        await invalidateProductCache(id, 'delete');

        // INVALIDATE REVIEW CACHE (Close logic loop)
        smartCache.invalidateByPrefix(smartCache.keys.reviews(id));

        return result;
    } catch (error) {
        logger.error(`Error in deleteProduct service for ${id}:`, error);
        throw error;
    }
};

/**
 * Delete variant - PERMANENTLY removes from DB
 * Images are moved to ImageKit trash (recoverable for 30 days)
 */
export const deleteVariant = async (id) => {
    try {
        // Import moveToTrash from imagekit config
        const { moveToTrash } = await import('../config/imagekit.js');

        const result = await variantRepository.hardDeleteVariant(id, moveToTrash);
        logger.info(`Variant ${id} deleted. ${result.imagesMovedToTrash} images moved to trash.`);

        // 🔔 Real-time sync
        await invalidateProductCache(result.productId || null, 'update');

        return result;
    } catch (error) {
        logger.error(`Error in deleteVariant service for ${id}:`, error);
        throw error;
    }
};

/**
 * Bulk delete products
 */
export const bulkDeleteProducts = async (ids) => {
    try {
        // Import moveToTrash from imagekit config
        const { moveToTrash } = await import('../config/imagekit.js');

        const results = { success: 0, failed: 0, imagesMovedToTrash: 0 };

        for (const id of ids) {
            try {
                const result = await productRepository.hardDeleteProduct(id, moveToTrash);
                results.success++;
                results.imagesMovedToTrash += result.imagesMovedToTrash;

                // Invalidate individual product cache
                smartCache.del(smartCache.keys.product(id));
            } catch (error) {
                logger.error(`Failed to delete product ${id}:`, error);
                results.failed++;
            }
        }

        // Invalidate using the Master Coordinator (Bulk optimized)
        await adminBroadcast.notifyBulkProductsChanged({ action: 'bulk_delete', count: ids.length });

        return results;
    } catch (error) {
        logger.error('Error in bulkDeleteProducts service:', error);
        throw error;
    }
};

/**
 * Bulk update product status
 */
export const bulkUpdateProductStatus = async (ids, isActive) => {
    try {
        const prisma = getPrisma();

        const result = await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { isActive }
        });

        // Invalidate using the Master Coordinator (Bulk optimized)
        await adminBroadcast.notifyBulkProductsChanged({
            action: 'status_update',
            affectedIds: ids,
            status: isActive
        });

        return result;
    } catch (error) {
        logger.error('Error in bulkUpdateProductStatus service:', error);
        throw error;
    }
};

/**
 * Duplicate product
 * TRANSACTIONAL: Product + Variants are copied atomically
 */
export const duplicateProduct = async (id) => {
    try {
        // 1. Get original product with variants
        const originalProduct = await productRepository.findProductById(id, true);

        if (!originalProduct) {
            throw new Error('Product not found');
        }

        const prisma = getPrisma();
        const { v4: uuidv4 } = await import('uuid');

        // ============================================
        // ATOMIC TRANSACTION: Product + Variants
        // ============================================
        const newProduct = await prisma.$transaction(async (tx) => {
            // 2. Create new product
            const product = await tx.product.create({
                data: {
                    name: `Copy of ${originalProduct.name}`,
                    description: originalProduct.description || '',
                    basePrice: originalProduct.basePrice,
                    categoryId: originalProduct.categoryId,
                    isActive: false, // Default to inactive
                    isFeatured: false,
                    images: originalProduct.images || [],
                }
            });

            // 3. Copy variants
            if (originalProduct.variants && originalProduct.variants.length > 0) {
                const variantsToCreate = originalProduct.variants.map(variant => {
                    const uniqueId = uuidv4().slice(0, 8).toUpperCase();
                    const newSku = `${product.id.slice(-6).toUpperCase()}-${uniqueId}`;

                    return {
                        productId: product.id,
                        sku: newSku,
                        price: variant.price,
                        stock: variant.stock,
                        color: variant.color || null,
                        length: variant.length || null,
                        texture: variant.texture || null,
                        size: variant.size || null,
                        images: variant.images || [],
                        isActive: true
                    };
                });

                await tx.variant.createMany({ data: variantsToCreate });
            } else {
                // Create default variant
                await tx.variant.create({
                    data: {
                        productId: product.id,
                        sku: `${product.id.slice(-6).toUpperCase()}-DEFAULT`,
                        price: product.basePrice,
                        stock: 0,
                        isActive: true,
                    }
                });
            }

            return product;
        }, { timeout: 10000 });

        const duplicatedProduct = await getProductById(newProduct.id);

        // Broadcast update
        await invalidateProductCache(newProduct.id, 'create');
        logger.info(`[TX] Product ${id} duplicated atomically to ${newProduct.id}`);

        return duplicatedProduct;
    } catch (error) {
        logger.error(`Error in duplicateProduct service for ${id}:`, error);
        throw error;
    }
};


/**
 * Create variant
 */
export const createVariant = async (data) => {
    try {
        // VALIDATION: Price must be greater than 0 (if provided and not using fallback)
        if (data.price !== undefined && data.price <= 0) {
            // We will fallback to product base price, so this is allowed now
            // throw new Error('Variant price must be greater than 0');
        }

        // Check if product exists
        const product = await productRepository.findProductById(data.productId, false);
        if (!product) {
            throw new Error('Product not found');
        }

        // Fallback to basePrice if price is 0 or undefined
        if (!data.price || data.price <= 0) {
            data.price = product.basePrice;
        }

        // VALIDATION: Ensure final price is > 0 (edge case protection)
        if (!data.price || parseFloat(data.price) <= 0) {
            throw new Error('Variant price must be greater than 0. Product base price is also invalid.');
        }

        // Check SKU uniqueness
        const existingSku = await variantRepository.findVariantBySku(data.sku);
        if (existingSku) {
            throw new Error('SKU already exists');
        }

        // Sanitize attributes (treat empty strings as null)
        const color = data.color || null;
        const length = data.length || null;
        const texture = data.texture || null;
        const size = data.size || null;

        // Update data object with sanitized values
        data.color = color;
        data.length = length;
        data.texture = texture;
        data.size = size;

        // Check Attribute Uniqueness (Color, Length, Texture, Size)
        const existingVariant = await variantRepository.findVariantByAttributes(
            data.productId,
            { color, length, texture, size }
        );

        if (existingVariant) {
            throw new Error('A variant with these attributes already exists');
        }

        // Validate images if present (only ImageKit URLs need Media table validation)
        const prisma = getPrisma();
        if (data.images && data.images.length > 0) {
            const imagekitUrls = data.images.filter(url => url.includes('ik.imagekit.io'));

            if (imagekitUrls.length > 0) {
                // Strip query parameters for lookup
                const urlsWithoutParams = imagekitUrls.map(url => url.split('?')[0]);

                const mediaRecords = await prisma.media.findMany({
                    where: {
                        url: { in: urlsWithoutParams },
                        status: 'active'
                    }
                });

                if (mediaRecords.length !== urlsWithoutParams.length) {
                    const foundUrls = mediaRecords.map(m => m.url);
                    const missingUrls = urlsWithoutParams.filter(url => !foundUrls.includes(url));
                    throw new Error(`Invalid or missing ImageKit images: ${missingUrls.join(', ')}`);
                }
            }
        }

        const variant = await variantRepository.createVariant(data);

        // Link ImageKit media records to variant (external URLs don't need linking)
        if (data.images && data.images.length > 0) {
            const imagekitUrls = data.images.filter(url => url.includes('ik.imagekit.io'));
            if (imagekitUrls.length > 0) {
                // Strip query params for linking
                const urlsWithoutParams = imagekitUrls.map(url => url.split('?')[0]);
                await prisma.media.updateMany({
                    where: { url: { in: urlsWithoutParams } },
                    data: {
                        usedBy: variant.id,
                        usageType: 'variant_image'
                    }
                });
            }
        }

        // Broadcast changes
        await invalidateProductCache(variant.productId, 'update');
        await adminBroadcast.notifyStockChanged({ productId: variant.productId, variantId: variant.id, action: 'create' });

        return variant;
    } catch (error) {
        logger.error('Error in createVariant service:', error);
        throw error;
    }
};

/**
 * Update variant
 */
export const updateVariant = async (id, data) => {
    try {
        // VALIDATION: Price must be greater than 0
        if (data.price !== undefined && data.price <= 0) {
            throw new Error('Variant price must be greater than 0');
        }

        const variant = await variantRepository.findVariantById(id);
        if (!variant) {
            throw new Error('Variant not found');
        }

        // Check SKU uniqueness if changing SKU
        if (data.sku && data.sku !== variant.sku) {
            const existingSku = await variantRepository.findVariantBySku(data.sku);
            if (existingSku) {
                throw new Error('SKU already exists');
            }
        }

        // Check Attribute Uniqueness if attributes are changing
        const attributesToCheck = ['color', 'length', 'texture', 'size'];
        const hasAttributeChange = attributesToCheck.some(attr => data[attr] !== undefined);

        if (hasAttributeChange) {
            // Calculate new effective attributes
            const newColor = data.color !== undefined ? (data.color || null) : variant.color;
            const newLength = data.length !== undefined ? (data.length || null) : variant.length;
            const newTexture = data.texture !== undefined ? (data.texture || null) : variant.texture;
            const newSize = data.size !== undefined ? (data.size || null) : variant.size;

            // Update data object with sanitized values if they were present
            if (data.color !== undefined) data.color = newColor;
            if (data.length !== undefined) data.length = newLength;
            if (data.texture !== undefined) data.texture = newTexture;
            if (data.size !== undefined) data.size = newSize;

            const existingVariant = await variantRepository.findVariantByAttributes(
                variant.productId,
                {
                    color: newColor,
                    length: newLength,
                    texture: newTexture,
                    size: newSize
                }
            );

            // Ensure we found a DIFFERENT variant, not the one we are updating
            if (existingVariant && existingVariant.id !== id) {
                throw new Error('A variant with these attributes already exists');
            }
        }

        // Handle image updates (only ImageKit URLs need Media table validation)
        if (data.images !== undefined) {
            const prisma = getPrisma();
            const imagekitUrls = data.images.filter(url => url.includes('ik.imagekit.io'));
            // Strip query params for lookups
            const urlsWithoutParams = imagekitUrls.map(url => url.split('?')[0]);

            // 1. Validate ImageKit images only
            if (urlsWithoutParams.length > 0) {
                const mediaRecords = await prisma.media.findMany({
                    where: {
                        url: { in: urlsWithoutParams },
                        status: 'active'
                    }
                });

                if (mediaRecords.length !== urlsWithoutParams.length) {
                    const foundUrls = mediaRecords.map(m => m.url);
                    const missingUrls = urlsWithoutParams.filter(url => !foundUrls.includes(url));
                    throw new Error(`Invalid or missing ImageKit images: ${missingUrls.join(', ')}`);
                }
            }

            // 2. Unlink all currently linked ImageKit images for this variant
            await prisma.media.updateMany({
                where: {
                    usedBy: id,
                    usageType: 'variant_image'
                },
                data: {
                    usedBy: null,
                    usageType: null
                }
            });

            // 3. Link new ImageKit images
            if (urlsWithoutParams.length > 0) {
                await prisma.media.updateMany({
                    where: { url: { in: urlsWithoutParams } },
                    data: {
                        usedBy: id,
                        usageType: 'variant_image'
                    }
                });
            }
        }

        const updatedVariant = await variantRepository.updateVariant(id, data);

        // Broadcast changes
        await adminBroadcast.notifyProductsChanged();
        if (data.stock !== undefined) {
            await adminBroadcast.notifyStockChanged();
        }

        return updatedVariant;
    } catch (error) {
        logger.error(`Error in updateVariant service for ${id}:`, error);
        throw error;
    }
};

/**
 * Bulk update variants
 */
export const bulkUpdateVariants = async (variantIds, updates) => {
    try {
        // Use service layer updateVariant() which includes all validation
        // (attribute uniqueness, SKU checks, price validation)
        const updatePromises = variantIds.map(id =>
            updateVariant(id, updates)  // Use service method, not repository
        );

        const results = await Promise.all(updatePromises);
        return results;
    } catch (error) {
        logger.error('Error in bulkUpdateVariants service:', error);
        throw error;
    }
};



/**
 * Get product categories
 * 
 * SMART CACHED: 10 min TTL, request deduplication, SWR
 */
export const getCategories = async () => {
    return smartCache.getOrFetch(
        smartCache.keys.categories(),
        () => productRepository.getCategories(),
        { type: 'categories', swr: true }
    );
};

/**
 * Bulk upload products from CSV
 * Expected headers: name, description, price, category, sku, stock, color, length, texture
 */
export const bulkUploadProducts = async (filePath) => {
    try {
        const fs = await import('fs');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Basic validation
        const requiredHeaders = ['name', 'price', 'category', 'sku'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        // Process rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());

            if (values.length !== headers.length) {
                results.failed++;
                results.errors.push(`Line ${i + 1}: Column count mismatch`);
                continue;
            }

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            try {
                // VALIDATION: Price must be > 0
                const price = parseFloat(row.price);
                if (isNaN(price) || price <= 0) {
                    results.failed++;
                    results.errors.push(`Line ${i + 1}: Price must be greater than 0`);
                    continue;
                }

                // VALIDATION: Stock must be >= 0
                const stock = parseInt(row.stock) || 0;
                if (stock < 0) {
                    results.failed++;
                    results.errors.push(`Line ${i + 1}: Stock cannot be negative`);
                    continue;
                }

                // 1. Find or Create Category
                let categoryId;
                const categorySlug = row.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const existingCategory = await categoryRepository.findCategoryBySlug(categorySlug);

                if (existingCategory) {
                    categoryId = existingCategory.id;
                } else {
                    // Create new category if not exists
                    const newCategory = await categoryRepository.createCategory({
                        name: row.category,
                        slug: categorySlug,
                        description: `Auto-created from bulk upload`,
                        type: 'standard'
                    });
                    categoryId = newCategory.id;
                }

                // 2. Create Product
                const productData = {
                    name: row.name,
                    description: row.description || '',
                    basePrice: price,
                    categoryId: categoryId,
                    isActive: true,
                    images: []
                };

                const product = await productRepository.createProduct(productData);

                // 3. Prepare variant data
                const color = row.color || null;
                const length = row.length || null;
                const texture = row.texture || null;
                const size = row.size || null;

                // VALIDATION: Check attribute uniqueness (should not happen on first variant, but good practice)
                const existingVariant = await variantRepository.findVariantByAttributes(
                    product.id,
                    { color, length, texture, size }
                );

                if (existingVariant) {
                    // Clean up the product we just created
                    await productRepository.hardDeleteProduct(product.id);
                    results.failed++;
                    results.errors.push(`Line ${i + 1}: Duplicate variant attributes`);
                    continue;
                }

                // 4. Create Variant
                const variantData = {
                    productId: product.id,
                    sku: row.sku,
                    price: price,
                    stock: stock,
                    color: color,
                    length: length,
                    texture: texture,
                    size: size,
                    isActive: true
                };

                await variantRepository.createVariant(variantData);

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Line ${i + 1}: ${err.message}`);
            }
        }

        // Broadcast after bulk upload
        if (results.success > 0) {
            await adminBroadcast.notifyProductsChanged();
            await adminBroadcast.notifyStockChanged();
        }

        // Cleanup file safely
        try {
            fs.unlinkSync(filePath);
        } catch (unlinkError) {
            logger.warn(`Failed to delete temp file ${filePath}: ${unlinkError.message}`);
            // Don't fail the entire operation if cleanup fails
        }

        return results;
    } catch (error) {
        logger.error('Error in bulkUploadProducts service:', error);
        throw error;
    }
};

export default {
    createProduct,
    getProductById,
    getAdminProductById,
    listProducts,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    createVariant,
    updateVariant,
    bulkUpdateVariants,
    deleteVariant,
    getCategories,
    bulkUploadProducts,
    bulkUpdateProductStatus,
    bulkDeleteProducts,
};
