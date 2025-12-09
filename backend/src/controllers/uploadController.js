import { uploadToImageKit, uploadFromUrl, deleteFromImageKit, purgeCacheForUrl } from '../config/imagekit.js';
import {
    generateVersionedUrl,
    validateExternalImageUrl,
    generateUniqueFilename,
    getFolderPath,
    validateFileSize,
    validateImageMimeType,
    extractFileIdFromUrl,
    validateFileSignature,
    generateFileHash,
    getImageDimensions,
    validateImageResolution,
} from '../utils/imageUtils.js';
import logger from '../utils/logger.js';
import { getPrisma } from '../config/database.js';

/**
 * Upload Controller - ImageKit Cloud Storage
 * Handles file uploads, URL uploads, and deletions with smart cache management
 */

/**
 * Handle file upload to ImageKit
 * POST /api/upload
 */
export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { message: 'No file uploaded' }
            });
        }

        // Validate file size (5MB default)
        const sizeValidation = validateFileSize(req.file.size, 5);
        if (!sizeValidation.valid) {
            return res.status(400).json({
                success: false,
                error: { message: sizeValidation.error }
            });
        }

        // Validate MIME type
        const mimeValidation = validateImageMimeType(req.file.mimetype);
        if (!mimeValidation.valid) {
            return res.status(400).json({
                success: false,
                error: { message: mimeValidation.error }
            });
        }

        // Validate file signature (magic bytes)
        const signatureValidation = await validateFileSignature(req.file.buffer);
        if (!signatureValidation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: signatureValidation.error,
                    code: 'INVALID_FILE_SIGNATURE'
                }
            });
        }

        // Generate file hash for duplicate detection
        const fileHash = generateFileHash(req.file.buffer);

        // Check for duplicate (unless force=true is specified)
        const forceUpload = req.query.force === 'true';
        const prisma = getPrisma();
        const existingFile = await prisma.media.findFirst({
            where: { fileHash, status: { not: 'deleted' } }
        });

        if (existingFile && !forceUpload) {
            // Return 409 CONFLICT - let user decide whether to use existing or force new upload
            logger.info(`Duplicate file detected, prompting user: ${existingFile.url}`);
            return res.status(409).json({
                success: false,
                isDuplicate: true,
                message: 'This image already exists. Use existing URL or add ?force=true to upload anyway.',
                existingFile: {
                    id: existingFile.id,
                    url: existingFile.url,
                    fileId: existingFile.fileId,
                    fileName: existingFile.fileName,
                    size: existingFile.size,
                    width: existingFile.width,
                    height: existingFile.height,
                    mimetype: existingFile.mimeType,
                    uploadedAt: existingFile.createdAt
                }
            });
        }

        // Extract image dimensions
        const dimensions = await getImageDimensions(req.file.buffer);

        // Validate resolution (25MP limit for ImageKit free plan)
        const resolutionValidation = validateImageResolution(dimensions.width, dimensions.height, 25);
        if (!resolutionValidation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: resolutionValidation.error,
                    code: 'RESOLUTION_LIMIT_EXCEEDED',
                    details: {
                        width: dimensions.width,
                        height: dimensions.height,
                        megapixels: resolutionValidation.megapixels,
                        limit: 25
                    }
                }
            });
        }

        // Determine folder based on query param or default to general
        const imageType = req.query.type || 'general';
        const folder = getFolderPath(imageType);

        // Generate unique filename
        const fileName = generateUniqueFilename(req.file.originalname, imageType);

        let uploadResult;
        let mediaRecord;

        try {
            // Upload to ImageKit
            uploadResult = await uploadToImageKit(
                req.file.buffer,
                fileName,
                folder,
                {
                    useUniqueFileName: false,
                    tags: [imageType, 'wighaven'],
                }
            );

            // Save media metadata to database in transaction
            mediaRecord = await prisma.$transaction(async (tx) => {
                const media = await tx.media.create({
                    data: {
                        fileId: uploadResult.fileId,
                        fileName: uploadResult.name,
                        filePath: uploadResult.filePath,
                        url: uploadResult.url,
                        fileHash,
                        type: imageType,
                        mimeType: signatureValidation.detectedType,
                        size: uploadResult.size,
                        width: uploadResult.width,
                        height: uploadResult.height,
                        uploadedBy: req.user.id,
                        status: 'active'
                    }
                });

                // Log admin activity
                await tx.adminActivity.create({
                    data: {
                        adminId: req.user.id,
                        action: 'MEDIA_UPLOADED',
                        entityType: 'Media',
                        entityId: media.id,
                        changes: {
                            fileName: media.fileName,
                            type: media.type,
                            size: media.size
                        },
                        ipAddress: req.ip
                    }
                });

                return media;
            });

            logger.info(`Media uploaded and tracked: ${mediaRecord.id}`);

        } catch (error) {
            // If database save fails, delete from ImageKit (rollback)
            if (uploadResult) {
                logger.warn('Database save failed, rolling back ImageKit upload...');
                try {
                    await deleteFromImageKit(uploadResult.fileId);
                } catch (deleteError) {
                    logger.error('Failed to rollback ImageKit upload:', deleteError);
                }
            }
            throw error;
        }

        // Generate versioned URL for cache busting
        const versionedUrl = generateVersionedUrl(uploadResult.url);

        // Purge cache for the base URL (asynchronous, don't wait)
        purgeCacheForUrl(uploadResult.url).catch(err =>
            logger.warn('Cache purge failed (non-critical):', err)
        );

        res.json({
            success: true,
            data: {
                id: mediaRecord.id, // Return media ID for entity linking
                url: versionedUrl,
                baseUrl: uploadResult.url,
                fileId: uploadResult.fileId,
                fileName: uploadResult.name,
                filePath: uploadResult.filePath,
                size: uploadResult.size,
                width: uploadResult.width,
                height: uploadResult.height,
                mimetype: signatureValidation.detectedType,
            }
        });
    } catch (error) {
        logger.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'File upload failed', details: error.message }
        });
    }
};

/**
 * Handle URL-based upload to ImageKit
 * POST /api/upload/url
 * Uploads an external URL to ImageKit and saves it to the Media table
 * This ensures ALL images are stored in ImageKit with proper tracking
 */
export const uploadFromUrlEndpoint = async (req, res) => {
    try {
        const { imageUrl, type = 'general' } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: { message: 'Image URL is required' }
            });
        }

        // Skip if already an ImageKit URL
        if (imageUrl.includes('ik.imagekit.io')) {
            // Check if it exists in Media table
            const prisma = getPrisma();
            const existingMedia = await prisma.media.findFirst({
                where: { url: imageUrl, status: { not: 'deleted' } }
            });

            if (existingMedia) {
                return res.json({
                    success: true,
                    data: {
                        id: existingMedia.id,
                        url: existingMedia.url,
                        baseUrl: existingMedia.url,
                        fileId: existingMedia.fileId,
                        fileName: existingMedia.fileName,
                        size: existingMedia.size,
                        width: existingMedia.width,
                        height: existingMedia.height,
                        isExisting: true
                    }
                });
            }
        }

        // Validate URL security and format
        const urlValidation = validateExternalImageUrl(imageUrl);
        if (!urlValidation.valid) {
            return res.status(400).json({
                success: false,
                error: { message: urlValidation.error }
            });
        }

        // Extract filename from URL or generate one
        const urlParts = new URL(imageUrl);
        const urlFileName = urlParts.pathname.split('/').pop() || 'image.jpg';
        const fileName = generateUniqueFilename(urlFileName, type);

        // Determine folder
        const folder = getFolderPath(type);

        let uploadResult;
        let mediaRecord;

        try {
            // Upload from URL to ImageKit
            uploadResult = await uploadFromUrl(imageUrl, fileName, folder);

            // Save to Media table for tracking
            const prisma = getPrisma();
            mediaRecord = await prisma.$transaction(async (tx) => {
                const media = await tx.media.create({
                    data: {
                        fileId: uploadResult.fileId,
                        fileName: uploadResult.name,
                        filePath: uploadResult.filePath,
                        url: uploadResult.url,
                        fileHash: null, // URL uploads don't have hash until we fetch and hash the content
                        type,
                        mimeType: uploadResult.fileType || 'image/jpeg',
                        size: uploadResult.size || 0,
                        width: uploadResult.width,
                        height: uploadResult.height,
                        uploadedBy: req.user.id,
                        status: 'active'
                    }
                });

                // Log admin activity
                await tx.adminActivity.create({
                    data: {
                        adminId: req.user.id,
                        action: 'MEDIA_UPLOADED_FROM_URL',
                        entityType: 'Media',
                        entityId: media.id,
                        changes: {
                            fileName: media.fileName,
                            type: media.type,
                            sourceUrl: imageUrl
                        },
                        ipAddress: req.ip
                    }
                });

                return media;
            });

            logger.info(`Media uploaded from URL and tracked: ${mediaRecord.id}`);

        } catch (error) {
            // If database save fails, delete from ImageKit (rollback)
            if (uploadResult) {
                logger.warn('Database save failed, rolling back ImageKit upload...');
                try {
                    await deleteFromImageKit(uploadResult.fileId);
                } catch (deleteError) {
                    logger.error('Failed to rollback ImageKit upload:', deleteError);
                }
            }
            throw error;
        }

        // Generate versioned URL
        const versionedUrl = generateVersionedUrl(uploadResult.url);

        // Purge cache (asynchronous)
        purgeCacheForUrl(uploadResult.url).catch(err =>
            logger.warn('Cache purge failed (non-critical):', err)
        );

        logger.info(`Image uploaded from URL: ${imageUrl} → ${fileName}`);

        res.json({
            success: true,
            data: {
                id: mediaRecord.id,
                url: versionedUrl,
                baseUrl: uploadResult.url,
                fileId: uploadResult.fileId,
                fileName: uploadResult.name,
                filePath: uploadResult.filePath,
                size: uploadResult.size,
                width: uploadResult.width,
                height: uploadResult.height,
                sourceUrl: imageUrl,
            }
        });
    } catch (error) {
        logger.error('URL upload error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'URL upload failed', details: error.message }
        });
    }
};

/**
 * Delete file from ImageKit
 * DELETE /api/upload
 */
export const deleteFile = async (req, res) => {
    try {
        const { fileId, url } = req.body;

        if (!fileId && !url) {
            return res.status(400).json({
                success: false,
                error: { message: 'Either fileId or url is required' }
            });
        }

        // Skip deletion for external URLs (non-ImageKit)
        if (url && !url.includes('ik.imagekit.io')) {
            logger.info(`Skipping deletion for external URL: ${url}`);
            return res.json({
                success: true,
                message: 'External URL - no ImageKit deletion needed'
            });
        }

        let actualFileId = fileId;

        // If URL provided instead of fileId, extract it
        if (!actualFileId && url) {
            actualFileId = extractFileIdFromUrl(url);
        }

        if (!actualFileId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Could not extract file ID from URL' }
            });
        }

        // Soft delete in database first (update status to 'deleted')
        const prisma = getPrisma();
        const mediaRecord = await prisma.media.findFirst({
            where: url ? { url } : { fileId: actualFileId }
        });

        if (mediaRecord) {
            await prisma.media.update({
                where: { id: mediaRecord.id },
                data: {
                    status: 'deleted',
                    usedBy: null,
                    usageType: null
                }
            });
            logger.info(`Media record soft-deleted in DB: ${mediaRecord.id}`);
        }

        // Purge cache before deletion (if URL provided)
        if (url) {
            await purgeCacheForUrl(url).catch(err =>
                logger.warn('Cache purge failed before deletion:', err)
            );
        }

        // Delete from ImageKit (moves to trash if enabled in ImageKit dashboard)
        await deleteFromImageKit(actualFileId);

        logger.info(`File deleted from ImageKit: ${actualFileId}`);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        logger.error('Delete file error:', error);

        // Handle specific ImageKit errors
        if (error.message.includes('FILE_NOT_FOUND')) {
            return res.status(404).json({
                success: false,
                error: { message: 'File not found' }
            });
        }

        res.status(500).json({
            success: false,
            error: { message: 'Failed to delete file', details: error.message }
        });
    }
};

/**
 * Batch upload multiple files
 * POST /api/upload/batch
 */
export const batchUploadFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'No files uploaded' }
            });
        }

        const imageType = req.query.type || 'general';
        const folder = getFolderPath(imageType);
        const uploadResults = [];
        const errors = [];

        // Upload files in parallel
        const uploadPromises = req.files.map(async (file, index) => {
            try {
                // Validate file
                const sizeValidation = validateFileSize(file.size, 5);
                if (!sizeValidation.valid) {
                    errors.push({ index, error: sizeValidation.error, fileName: file.originalname });
                    return null;
                }

                const mimeValidation = validateImageMimeType(file.mimetype);
                if (!mimeValidation.valid) {
                    errors.push({ index, error: mimeValidation.error, fileName: file.originalname });
                    return null;
                }

                const fileName = generateUniqueFilename(file.originalname, imageType);
                const uploadResult = await uploadToImageKit(file.buffer, fileName, folder);
                const versionedUrl = generateVersionedUrl(uploadResult.url);

                // Purge cache asynchronously
                purgeCacheForUrl(uploadResult.url).catch(() => { });

                return {
                    url: versionedUrl,
                    baseUrl: uploadResult.url,
                    fileId: uploadResult.fileId,
                    fileName: uploadResult.name,
                    originalName: file.originalname,
                };
            } catch (error) {
                errors.push({ index, error: error.message, fileName: file.originalname });
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(r => r !== null);

        res.json({
            success: true,
            data: {
                uploaded: successfulUploads,
                total: req.files.length,
                successful: successfulUploads.length,
                failed: errors.length,
                errors: errors.length > 0 ? errors : undefined,
            }
        });
    } catch (error) {
        logger.error('Batch upload error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Batch upload failed', details: error.message }
        });
    }
};

/**
 * Check if file is a duplicate before uploading
 * POST /api/upload/check-hash
 * Allows frontend to pre-check before upload to give user choice
 */
export const checkDuplicateHash = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { message: 'No file provided' }
            });
        }

        // Validate file signature
        const signatureValidation = await validateFileSignature(req.file.buffer);
        if (!signatureValidation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: signatureValidation.error,
                    code: 'INVALID_FILE_SIGNATURE'
                }
            });
        }

        // Generate hash and check for duplicate
        const fileHash = generateFileHash(req.file.buffer);
        const prisma = getPrisma();
        const existingFile = await prisma.media.findFirst({
            where: { fileHash, status: { not: 'deleted' } }
        });

        if (existingFile) {
            return res.json({
                success: true,
                isDuplicate: true,
                message: 'This image already exists in the system.',
                existingFile: {
                    id: existingFile.id,
                    url: existingFile.url,
                    fileId: existingFile.fileId,
                    fileName: existingFile.fileName,
                    size: existingFile.size,
                    width: existingFile.width,
                    height: existingFile.height,
                    mimetype: existingFile.mimeType,
                    uploadedAt: existingFile.createdAt
                }
            });
        }

        // No duplicate found
        return res.json({
            success: true,
            isDuplicate: false,
            message: 'No duplicate found. Safe to upload.',
            fileHash
        });

    } catch (error) {
        logger.error('Check duplicate hash error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to check for duplicates', details: error.message }
        });
    }
};

export default {
    uploadFile,
    uploadFromUrlEndpoint,
    deleteFile,
    batchUploadFiles,
    checkDuplicateHash,
};
