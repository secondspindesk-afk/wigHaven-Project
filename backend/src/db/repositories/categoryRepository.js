import { getPrisma } from '../../config/database.js';

/**
 * Create category
 */
const createCategory = async (data) => {
    const prisma = getPrisma();

    // Map snake_case fields from frontend to camelCase for Prisma
    const mappedData = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        type: data.type || 'standard',
        isActive: data.is_active ?? data.isActive ?? true,
        isFeatured: data.is_featured ?? data.isFeatured ?? false,
    };

    return await prisma.category.create({
        data: mappedData,
    });
};

/**
 * Find category by ID
 */
const findCategoryById = async (id) => {
    const prisma = getPrisma();
    return await prisma.category.findUnique({
        where: { id }
    });
};

/**
 * Find category by slug
 */
const findCategoryBySlug = async (slug) => {
    const prisma = getPrisma();
    return await prisma.category.findUnique({
        where: { slug }
    });
};

/**
 * Get all categories (with filters)
 */
const getCategories = async ({ isActive, type, search, page = 1, limit = 20 }) => {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;
    const where = {};

    if (isActive !== undefined) {
        where.isActive = isActive;
    }

    if (type) {
        where.type = type;
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [categories, total] = await Promise.all([
        prisma.category.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { products: true }
                }
            },
        }),
        prisma.category.count({ where }),
    ]);

    // Map to include product_count and convert to snake_case for frontend
    const mappedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        isActive: cat.isActive,
        isFeatured: cat.isFeatured,
        type: cat.type,
        productCount: cat._count?.products || 0,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
    }));

    return {
        categories: mappedCategories,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
    };
};

/**
 * Update category
 */
const updateCategory = async (id, data) => {
    const prisma = getPrisma();

    // Map snake_case fields from frontend to camelCase for Prisma
    const mappedData = {};
    if (data.name !== undefined) mappedData.name = data.name;
    if (data.description !== undefined) mappedData.description = data.description;
    if (data.image !== undefined) mappedData.image = data.image;
    if (data.type !== undefined) mappedData.type = data.type;

    // Handle both snake_case and camelCase for boolean fields
    if (data.is_active !== undefined) mappedData.isActive = data.is_active;
    else if (data.isActive !== undefined) mappedData.isActive = data.isActive;

    if (data.is_featured !== undefined) mappedData.isFeatured = data.is_featured;
    else if (data.isFeatured !== undefined) mappedData.isFeatured = data.isFeatured;

    return await prisma.category.update({
        where: { id },
        data: mappedData,
    });
};

/**
 * Find category by name
 */
const findCategoryByName = async (name) => {
    const prisma = getPrisma();
    return await prisma.category.findUnique({
        where: { name },
    });
};

/**
 * Delete category - PERMANENTLY removes if no products
 * @throws Error if category has products
 */
const deleteCategory = async (id) => {
    const prisma = getPrisma();

    // Check if category has products
    const productCount = await prisma.product.count({
        where: { categoryId: id }
    });

    if (productCount > 0) {
        throw new Error(`Cannot delete category with ${productCount} products. Remove or reassign products first.`);
    }

    return await prisma.category.delete({
        where: { id },
    });
};

export default {
    createCategory,
    findCategoryById,
    findCategoryBySlug,
    findCategoryByName,
    getCategories,
    updateCategory,
    deleteCategory,
};

