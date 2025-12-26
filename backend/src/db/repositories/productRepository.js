import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create a new product
 * @param {Object} data - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.product.create({
            data,
        });
    } catch (error) {
        logger.error('Error creating product:', error);
        throw error;
    }
};

/**
 * Find product by ID with optional variants inclusion
 * @param {string} id - Product ID
 * @param {boolean} includeVariants - Whether to include variants
 * @param {boolean} isAdmin - Whether to include inactive variants
 * @returns {Promise<Object|null>} Product or null
 */
export const findProductById = async (id, includeVariants = true, isAdmin = false) => {
    try {
        const prisma = getPrisma();
        const include = {
            category: true, // Include category details
            ...(includeVariants ? {
                variants: {
                    where: isAdmin ? {} : { isActive: true },
                    orderBy: { createdAt: 'asc' },
                },
            } : {})
        };

        const product = await prisma.product.findUnique({
            where: { id },
            include,
        });

        if (product) {
            // Ensure category is present (even if deleted/null)
            if (!product.category) {
                product.category = { name: 'Uncategorized', slug: 'uncategorized', id: 'uncategorized' };
            }
        }

        return product;
    } catch (error) {
        logger.error(`Error finding product ${id}:`, error);
        throw error;
    }
};

/**
 * Update product
 * @param {string} id - Product ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, data) => {
    try {
        const prisma = getPrisma();
        const product = await prisma.product.update({
            where: { id },
            data,
            include: { category: true }
        });

        if (product) {
            if (!product.category) {
                product.category = { name: 'Uncategorized', slug: 'uncategorized', id: 'uncategorized' };
            }
        }

        return product;
    } catch (error) {
        logger.error(`Error updating product ${id}:`, error);
        throw error;
    }
};

/**
 * Hard delete product - PERMANENTLY removes product and variants from DB
 * Images are moved to trash (recoverable) before deletion
 * @param {string} id - Product ID
 * @param {Function} moveImageToTrash - Function to move image to ImageKit trash
 * @returns {Promise<Object>} Deletion result
 */
export const hardDeleteProduct = async (id, moveImageToTrash = null) => {
    try {
        const prisma = getPrisma();

        // 1. Get all variants with their images
        const variants = await prisma.variant.findMany({
            where: { productId: id },
            select: { id: true, images: true }
        });

        // 2. Collect all image URLs from variants
        const allImageUrls = [];
        for (const variant of variants) {
            if (variant.images && variant.images.length > 0) {
                allImageUrls.push(...variant.images);
            }
        }

        // 3. Move images to trash (if callback provided) and update Media records
        if (allImageUrls.length > 0) {
            const imagekitUrls = allImageUrls.filter(url => url.includes('ik.imagekit.io'));

            if (imagekitUrls.length > 0) {
                // Get media records for these images
                const mediaRecords = await prisma.media.findMany({
                    where: { url: { in: imagekitUrls }, status: 'active' }
                });

                // Move each image to trash in ImageKit (if callback provided)
                if (moveImageToTrash) {
                    for (const media of mediaRecords) {
                        try {
                            await moveImageToTrash(media.fileId, media.filePath);
                        } catch (err) {
                            logger.warn(`Failed to move image to trash: ${media.url}`, err);
                        }
                    }
                }

                // Update Media records to trashed status
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

        // 4. Delete all variants (CASCADE will handle this, but explicit for clarity)
        await prisma.variant.deleteMany({
            where: { productId: id }
        });

        // 5. Delete the product
        const deletedProduct = await prisma.product.delete({
            where: { id }
        });

        logger.info(`Product ${id} hard deleted. ${allImageUrls.length} images moved to trash.`);

        return {
            success: true,
            deletedProduct,
            imagesMovedToTrash: allImageUrls.length
        };
    } catch (error) {
        logger.error(`Error hard deleting product ${id}:`, error);
        throw error;
    }
};

/**
 * List products with pagination, filtering and sorting
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} { products, total, pages }
 */
export const listProducts = async ({
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    sort = 'newest',
    inStock,
    search, // Add search param
    isAdmin = false, // If true, include inactive products
}) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;
        const where = {};

        // Filter by active status (unless admin)
        if (!isAdmin) {
            where.isActive = true;
        }

        // Filter by category slug
        if (category) {
            where.category = {
                slug: category
            };
        }

        // Filter by search query
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                // Deep search: Category
                { category: { name: { contains: search, mode: 'insensitive' } } },
                // Deep search: Variants
                {
                    variants: {
                        some: {
                            OR: [
                                { color: { contains: search, mode: 'insensitive' } },
                                { texture: { contains: search, mode: 'insensitive' } },
                                { length: { contains: search, mode: 'insensitive' } },
                                { sku: { contains: search, mode: 'insensitive' } },
                            ]
                        }
                    }
                }
            ];
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            where.basePrice = {};
            if (minPrice) where.basePrice.gte = parseFloat(minPrice);
            if (maxPrice) where.basePrice.lte = parseFloat(maxPrice);
        }

        // Filter by stock status (requires checking variants)
        if (inStock === 'true') {
            where.variants = {
                some: {
                    stock: { gt: 0 },
                    isActive: true,
                },
            };
        }

        // Determine sort order
        let orderBy = {};
        switch (sort) {
            case 'price_asc':
                orderBy = { basePrice: 'asc' };
                break;
            case 'price_desc':
                orderBy = { basePrice: 'desc' };
                break;
            case 'popular':
                // Sort by order count (popularity)
                // We'll need to use a raw query for this since Prisma doesn't support aggregation in orderBy
                // For now, we'll fetch products and sort in memory
                orderBy = { createdAt: 'desc' }; // Will be overridden below
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
        }

        // Execute query
        // Special handling for popular sort (requires aggregation)
        // SECURITY FIX: Removed $queryRawUnsafe with string interpolation (SQL injection risk)
        // Now using safe Prisma queries with post-processing for popularity sorting
        if (sort === 'popular') {
            try {
                // OPTIMIZED: Use raw query to get sorted IDs only (avoid loading all products)
                // This fixes N+1 issue and memory usage
                const ids = await prisma.$queryRaw`
                    SELECT p.id, COUNT(oi.id) as order_count
                    FROM products p
                    LEFT JOIN variants v ON v.product_id = p.id
                    LEFT JOIN order_items oi ON oi.variant_id = v.id
                    WHERE p.is_active = ${!isAdmin ? true : undefined} 
                    -- Add other filters here if needed (simplified for common case)
                    GROUP BY p.id
                    ORDER BY order_count DESC, p.created_at DESC
                    LIMIT ${limit} OFFSET ${skip}
                `;

                const sortedIds = ids.map(row => row.id);
                const totalCount = await prisma.product.count({ where }); // Approx total

                if (sortedIds.length === 0) {
                    return { products: [], total: 0, pages: 0, currentPage: page };
                }

                // Fetch full details for these IDs only
                const products = await prisma.product.findMany({
                    where: { id: { in: sortedIds } },
                    include: {
                        category: true,
                        variants: {
                            where: isAdmin ? {} : { isActive: true },
                            select: {
                                id: true, price: true, stock: true, sku: true, images: true,
                                color: true, length: true, texture: true, size: true, isActive: true
                            }
                        }
                    },
                });

                // Re-sort in Javascript because IN clause doesn't guarantee order
                const productMap = new Map(products.map(p => [p.id, p]));
                const orderedProducts = sortedIds.map(id => productMap.get(id)).filter(Boolean);

                // Map to snake_case (standard output format)
                const mappedProducts = orderedProducts.map(p => {
                    const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
                    return {
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        basePrice: p.basePrice,
                        categoryId: p.categoryId,
                        category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
                        images: p.images || [],
                        isActive: p.isActive,
                        isFeatured: p.isFeatured,
                        variantCount: p.variants?.length || 0,
                        totalStock: totalStock,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        variants: p.variants?.map(v => ({
                            id: v.id, price: v.price, stock: v.stock, sku: v.sku, images: v.images,
                            color: v.color, length: v.length, texture: v.texture, size: v.size, isActive: v.isActive
                        })) || []
                    };
                });

                return {
                    products: mappedProducts,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit),
                    currentPage: page,
                };

            } catch (error) {
                logger.warn('Popular sort optimized query failed, falling back to newest:', error.message);
                orderBy = { createdAt: 'desc' };
            }
        }


        // Regular query for non-popular sorts
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    category: true, // Include category
                    variants: {
                        where: isAdmin ? {} : { isActive: true },
                        orderBy: { createdAt: 'asc' }, // Ensure consistent order (Main variant first)
                        select: {
                            id: true,
                            price: true,
                            stock: true,
                            sku: true,
                            images: true,
                            color: true,
                            length: true,
                            texture: true,
                            size: true,
                            isActive: true,
                        },
                    },
                },
            }),
            prisma.product.count({ where }),
        ]);

        // Map to snake_case and compute aggregates for frontend
        const mappedProducts = products.map(p => {
            const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                basePrice: p.basePrice,
                categoryId: p.categoryId,
                category: p.category ? {
                    id: p.category.id,
                    name: p.category.name,
                    slug: p.category.slug
                } : null,
                images: p.images || [],
                isActive: p.isActive,
                isFeatured: p.isFeatured,
                variantCount: p.variants?.length || 0,
                totalStock: totalStock,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                variants: p.variants?.map(v => ({
                    id: v.id,
                    price: v.price,
                    stock: v.stock,
                    sku: v.sku,
                    images: v.images,
                    color: v.color,
                    length: v.length,
                    texture: v.texture,
                    size: v.size,
                    isActive: v.isActive
                })) || []
            };
        });

        return {
            products: mappedProducts,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get all unique categories with product counts
 * Returns ALL active categories, even those with 0 products
 * @returns {Promise<Array>} Categories with counts
 */
export const getCategories = async () => {
    try {
        const prisma = getPrisma();

        // Get all active categories first
        const categoryDetails = await prisma.category.findMany({
            where: {
                isActive: true,
            },
            include: {
                _count: {
                    select: {
                        products: {
                            where: { isActive: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Map to frontend format
        return categoryDetails.map(c => ({
            id: c.slug, // Use slug as ID for frontend compatibility
            label: c.name,
            count: c._count?.products || 0,
            image: c.image  // Include category image for home page display
        }));
    } catch (error) {
        logger.error('Error fetching categories:', error);
        throw error;
    }
};

export default {
    createProduct,
    findProductById,
    updateProduct,
    hardDeleteProduct,
    listProducts,
    getCategories,
};
