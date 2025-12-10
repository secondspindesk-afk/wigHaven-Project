import categoryService from '../services/categoryService.js';
import { notifyCategoriesChanged } from '../utils/adminBroadcast.js';

/**
 * Create category (Admin)
 */
export const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body);

        // 🔔 Real-time: Notify all admin dashboards
        notifyCategoriesChanged({ action: 'created', categoryId: category.id });

        res.status(201).json({
            success: true,
            data: category,
        });
    } catch (error) {
        if (error.message === 'Slug already exists') {
            return res.status(409).json({ success: false, error: { message: error.message } });
        }
        next(error);
    }
};

/**
 * List categories (Public/Admin)
 */
export const listCategories = async (req, res, next) => {
    try {
        const { page, isActive, type, search } = req.query;

        // Convert isActive query param to boolean if present
        let activeFilter = undefined;
        if (isActive === 'true') activeFilter = true;
        if (isActive === 'false') activeFilter = false;

        const result = await categoryService.getCategories({
            page: parseInt(page) || 1,
            limit: 20,
            isActive: activeFilter,
            type,
            search,
        });

        res.json({
            success: true,
            data: result.categories,
            pagination: {
                page: result.currentPage,
                limit: 20,
                total: result.total,
                pages: result.pages,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get category (Public)
 */
export const getCategory = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: { message: 'Category not found' },
            });
        }
        res.json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update category (Admin)
 */
export const updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);

        // 🔔 Real-time: Notify all admin dashboards
        notifyCategoriesChanged({ action: 'updated', categoryId: req.params.id });

        res.json({
            success: true,
            data: category,
        });
    } catch (error) {
        if (error.message === 'Slug already exists') {
            return res.status(409).json({ success: false, error: { message: error.message } });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, error: { message: 'Category not found' } });
        }
        next(error);
    }
};

/**
 * Delete category (Admin)
 */
export const deleteCategory = async (req, res, next) => {
    try {
        const { transferToId } = req.body;
        await categoryService.deleteCategory(req.params.id, transferToId);

        // 🔔 Real-time: Notify all admin dashboards
        notifyCategoriesChanged({ action: 'deleted', categoryId: req.params.id });

        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, error: { message: 'Category not found' } });
        }
        next(error);
    }
};

export default {
    createCategory,
    listCategories,
    getCategory,
    updateCategory,
    deleteCategory,
};
