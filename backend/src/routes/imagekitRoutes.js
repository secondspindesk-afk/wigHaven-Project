import express from 'express';
import Joi from 'joi';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';
import {
    listFiles,
    createFolder,
    deleteFolder,
    moveFile,
    copyFile,
    bulkDeleteFiles,
    getFileDetails,
    deleteFromImageKit
} from '../config/imagekit.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const listFilesSchema = Joi.object({
    path: Joi.string().default('/'),
    skip: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    searchQuery: Joi.string().allow('').optional(),
    type: Joi.string().valid('file', 'folder', 'all').optional()
});

const createFolderSchema = Joi.object({
    folderName: Joi.string().min(1).max(255).required(),
    parentFolderPath: Joi.string().default('/')
});

const deleteFolderSchema = Joi.object({
    folderPath: Joi.string().min(1).required()
});

const moveFileSchema = Joi.object({
    sourceFilePath: Joi.string().min(1).required(),
    destinationPath: Joi.string().min(1).required()
});

const bulkDeleteSchema = Joi.object({
    fileIds: Joi.array().items(Joi.string()).min(1).max(100).required()
});

/**
 * ImageKit Manager Routes
 * All routes require super_admin authentication
 */
router.use(authenticateToken, requireRole('super_admin'));

/**
 * GET /super-admin/imagekit/files
 * List files and folders at a given path
 */
router.get('/files', async (req, res, next) => {
    try {
        const { error, value } = listFilesSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const files = await listFiles(value);
        res.json({
            success: true,
            data: files,
            count: files.length,
            path: value.path
        });
    } catch (err) {
        logger.error('ImageKit list files error:', err);
        next(err);
    }
});

/**
 * GET /super-admin/imagekit/files/:fileId
 * Get details for a specific file
 */
router.get('/files/:fileId', async (req, res, next) => {
    try {
        const { fileId } = req.params;
        const details = await getFileDetails(fileId);
        res.json({
            success: true,
            data: details
        });
    } catch (err) {
        logger.error('ImageKit get file details error:', err);
        next(err);
    }
});

/**
 * POST /super-admin/imagekit/folders
 * Create a new folder
 */
router.post('/folders', validateRequest(createFolderSchema), async (req, res, next) => {
    try {
        const { folderName, parentFolderPath } = req.body;
        const result = await createFolder(folderName, parentFolderPath);
        res.json({
            success: true,
            message: `Folder '${folderName}' created successfully`,
            data: result
        });
    } catch (err) {
        logger.error('ImageKit create folder error:', err);
        next(err);
    }
});

/**
 * DELETE /super-admin/imagekit/folders
 * Delete a folder and all its contents
 */
router.delete('/folders', validateRequest(deleteFolderSchema), async (req, res, next) => {
    try {
        const { folderPath } = req.body;
        const result = await deleteFolder(folderPath);
        res.json({
            success: true,
            message: `Folder '${folderPath}' deleted successfully`,
            data: result
        });
    } catch (err) {
        logger.error('ImageKit delete folder error:', err);
        next(err);
    }
});

/**
 * DELETE /super-admin/imagekit/files/:fileId
 * Delete a single file
 */
router.delete('/files/:fileId', async (req, res, next) => {
    try {
        const { fileId } = req.params;
        await deleteFromImageKit(fileId);
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (err) {
        logger.error('ImageKit delete file error:', err);
        next(err);
    }
});

/**
 * POST /super-admin/imagekit/files/move
 * Move a file to a different folder
 */
router.post('/files/move', validateRequest(moveFileSchema), async (req, res, next) => {
    try {
        const { sourceFilePath, destinationPath } = req.body;
        const result = await moveFile(sourceFilePath, destinationPath);
        res.json({
            success: true,
            message: 'File moved successfully',
            data: result
        });
    } catch (err) {
        logger.error('ImageKit move file error:', err);
        next(err);
    }
});

/**
 * POST /super-admin/imagekit/files/copy
 * Copy a file to a different folder
 */
router.post('/files/copy', validateRequest(moveFileSchema), async (req, res, next) => {
    try {
        const { sourceFilePath, destinationPath } = req.body;
        const result = await copyFile(sourceFilePath, destinationPath);
        res.json({
            success: true,
            message: 'File copied successfully',
            data: result
        });
    } catch (err) {
        logger.error('ImageKit copy file error:', err);
        next(err);
    }
});

/**
 * POST /super-admin/imagekit/files/bulk-delete
 * Delete multiple files at once
 */
router.post('/files/bulk-delete', validateRequest(bulkDeleteSchema), async (req, res, next) => {
    try {
        const { fileIds } = req.body;
        const result = await bulkDeleteFiles(fileIds);
        res.json({
            success: true,
            message: `${fileIds.length} files deleted successfully`,
            data: result
        });
    } catch (err) {
        logger.error('ImageKit bulk delete error:', err);
        next(err);
    }
});

export default router;
