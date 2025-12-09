import { getPrisma } from '../config/database.js';
import { deleteFromImageKit, moveToTrash, restoreFromTrash } from '../config/imagekit.js';
import logger from '../utils/logger.js';

/**
 * Media Controller - Admin routes for media management
 * Handles listing, trashing, restoring, and deleting media files
 */

/**
 * List all media - DIRECTLY from source tables (no sync needed)
 * GET /api/admin/media?type=variant&limit=50
 */
export const listMedia = async (req, res) => {
    try {
        const { type, search, limit = 100 } = req.query;
        const prisma = getPrisma();
        const limitNum = Math.min(100, parseInt(limit) || 100); // Cap at 100

        // Directly fetch images from all source tables
        const [variants, categories, banners, reviews] = await Promise.all([
            prisma.variant.findMany({
                select: {
                    id: true,
                    sku: true,
                    images: true,
                    product: { select: { id: true, name: true } }
                }
            }),
            prisma.category.findMany({
                select: { id: true, name: true, image: true }
            }),
            prisma.promotionalBanner.findMany({
                select: { id: true, title: true, imageUrl: true }
            }),
            prisma.review.findMany({
                select: { id: true, title: true, images: true }
            })
        ]);

        // Build unified media list
        let allMedia = [];

        // Helper to extract filename
        const getFileName = (url) => {
            try {
                const urlObj = new URL(url);
                const parts = urlObj.pathname.split('/');
                return parts[parts.length - 1] || 'image.jpg';
            } catch { return 'image.jpg'; }
        };

        // Add variant images
        variants.forEach(v => {
            if (Array.isArray(v.images) && v.images.length > 0) {
                v.images.forEach((url, index) => {
                    if (url) {
                        allMedia.push({
                            id: `variant_${v.id}_${index}`,
                            url,
                            thumbnailUrl: url,
                            fileName: getFileName(url),
                            type: 'variant',
                            size: 0,
                            usedBy: v.id,
                            usageType: 'variant',
                            entityName: v.product?.name || v.sku
                        });
                    }
                });
            }
        });

        // Add category images
        categories.forEach(c => {
            if (c.image) {
                allMedia.push({
                    id: `category_${c.id}`,
                    url: c.image,
                    thumbnailUrl: c.image,
                    fileName: getFileName(c.image),
                    type: 'category',
                    size: 0,
                    usedBy: c.id,
                    usageType: 'category',
                    entityName: c.name
                });
            }
        });

        // Add banner images
        banners.forEach(b => {
            if (b.imageUrl) {
                allMedia.push({
                    id: `banner_${b.id}`,
                    url: b.imageUrl,
                    thumbnailUrl: b.imageUrl,
                    fileName: getFileName(b.imageUrl),
                    type: 'banner',
                    size: 0,
                    usedBy: b.id,
                    usageType: 'banner',
                    entityName: b.title
                });
            }
        });

        // Add review images
        reviews.forEach(r => {
            if (Array.isArray(r.images) && r.images.length > 0) {
                r.images.forEach((url, index) => {
                    if (url) {
                        allMedia.push({
                            id: `review_${r.id}_${index}`,
                            url,
                            thumbnailUrl: url,
                            fileName: getFileName(url),
                            type: 'review',
                            size: 0,
                            usedBy: r.id,
                            usageType: 'review',
                            entityName: r.title
                        });
                    }
                });
            }
        });

        // Filter by type if specified
        if (type && type !== 'all') {
            allMedia = allMedia.filter(m => m.type === type);
        }

        // Filter by search if specified
        if (search) {
            const searchLower = search.toLowerCase();
            allMedia = allMedia.filter(m =>
                m.fileName.toLowerCase().includes(searchLower) ||
                (m.entityName && m.entityName.toLowerCase().includes(searchLower))
            );
        }

        // Apply limit
        const paginatedMedia = allMedia.slice(0, limitNum);

        res.json({
            success: true,
            data: paginatedMedia,
            pagination: {
                total: allMedia.length,
                page: 1,
                limit: limitNum,
                pages: Math.ceil(allMedia.length / limitNum)
            }
        });
    } catch (error) {
        logger.error('List media error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to list media', details: error.message }
        });
    }
};

/**
 * Get trash
 * GET /api/admin/media/trash
 */
export const getTrash = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { status: 'trashed' };

        const [media, total] = await Promise.all([
            getPrisma().media.findMany({
                where,
                include: {
                    uploader: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    trasher: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { trashedAt: 'desc' },
                skip,
                take: limitNum
            }),
            getPrisma().media.count({ where })
        ]);

        res.json({
            success: true,
            data: media,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Get trash error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to get trash', details: error.message }
        });
    }
};

/**
 * Soft delete (move to trash)
 * DELETE /api/admin/media/:id/soft
 */
export const softDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = getPrisma();

        const media = await prisma.media.findUnique({ where: { id } });
        if (!media) {
            return res.status(404).json({
                success: false,
                error: { message: 'Media not found' }
            });
        }

        if (media.status === 'trashed') {
            return res.status(400).json({
                success: false,
                error: { message: 'Media is already in trash' }
            });
        }

        // Move file in ImageKit
        const result = await moveToTrash(media.fileId, media.filePath);

        // Update database
        const updatedMedia = await prisma.$transaction(async (tx) => {
            const updated = await tx.media.update({
                where: { id },
                data: {
                    status: 'trashed',
                    trashedAt: new Date(),
                    trashedBy: req.user.id,
                    filePath: result.newPath
                }
            });

            // Log admin activity
            await tx.adminActivity.create({
                data: {
                    adminId: req.user.id,
                    action: 'MEDIA_SOFT_DELETED',
                    entityType: 'Media',
                    entityId: id,
                    changes: { fileName: media.fileName, from: media.filePath, to: result.newPath },
                    ipAddress: req.ip
                }
            });

            return updated;
        });

        logger.info(`Media soft deleted: ${id}`);

        res.json({
            success: true,
            data: updatedMedia,
            message: 'Media moved to trash successfully'
        });
    } catch (error) {
        logger.error('Soft delete error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to soft delete media', details: error.message }
        });
    }
};

/**
 * Restore from trash
 * POST /api/admin/media/:id/restore
 */
export const restore = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = getPrisma();

        const media = await prisma.media.findUnique({ where: { id } });
        if (!media) {
            return res.status(404).json({
                success: false,
                error: { message: 'Media not found' }
            });
        }

        if (media.status !== 'trashed') {
            return res.status(400).json({
                success: false,
                error: { message: 'Media is not in trash' }
            });
        }

        // Determine original folder from type
        const folderMap = {
            product: '/products',
            review: '/reviews',
            variant: '/variants',
            category: '/categories',
            general: '/'
        };
        const originalFolder = folderMap[media.type] || '/';

        // Restore file in ImageKit
        const result = await restoreFromTrash(media.fileId, media.filePath, originalFolder);

        // Update database
        const updatedMedia = await prisma.$transaction(async (tx) => {
            const updated = await tx.media.update({
                where: { id },
                data: {
                    status: 'active',
                    trashedAt: null,
                    trashedBy: null,
                    filePath: result.newPath
                }
            });

            // Log admin activity
            await tx.adminActivity.create({
                data: {
                    adminId: req.user.id,
                    action: 'MEDIA_RESTORED',
                    entityType: 'Media',
                    entityId: id,
                    changes: { fileName: media.fileName, from: media.filePath, to: result.newPath },
                    ipAddress: req.ip
                }
            });

            return updated;
        });

        logger.info(`Media restored: ${id}`);

        res.json({
            success: true,
            data: updatedMedia,
            message: 'Media restored successfully'
        });
    } catch (error) {
        logger.error('Restore error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to restore media', details: error.message }
        });
    }
};

/**
 * Hard delete (permanent)
 * DELETE /api/admin/media/:id/hard
 */
export const hardDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const prisma = getPrisma();

        const media = await prisma.media.findUnique({ where: { id } });
        if (!media) {
            return res.status(404).json({
                success: false,
                error: { message: 'Media not found' }
            });
        }

        // Check if media is in use
        if (media.usedBy && media.status === 'active') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Cannot delete media that is currently in use. Please remove it from the associated entity first.',
                    usedBy: media.usedBy,
                    usageType: media.usageType
                }
            });
        }

        // Delete from ImageKit
        await deleteFromImageKit(media.fileId);

        // Update database (mark as deleted, don't actually delete for audit trail)
        const updatedMedia = await prisma.$transaction(async (tx) => {
            const updated = await tx.media.update({
                where: { id },
                data: { status: 'deleted' }
            });

            // Log admin activity
            await tx.adminActivity.create({
                data: {
                    adminId: req.user.id,
                    action: 'MEDIA_HARD_DELETED',
                    entityType: 'Media',
                    entityId: id,
                    changes: { fileName: media.fileName, fileId: media.fileId },
                    ipAddress: req.ip
                }
            });

            return updated;
        });

        logger.info(`Media hard deleted: ${id}`);

        res.json({
            success: true,
            data: updatedMedia,
            message: 'Media deleted permanently'
        });
    } catch (error) {
        logger.error('Hard delete error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to delete media', details: error.message }
        });
    }
};

/**
 * Batch delete (soft or hard)
 * DELETE /api/admin/media/batch
 * Body: { ids: string[], type: 'soft' | 'hard' }
 */
export const batchDelete = async (req, res) => {
    try {
        const { ids, type = 'soft' } = req.body;
        const prisma = getPrisma();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'No media IDs provided' }
            });
        }

        const mediaList = await prisma.media.findMany({
            where: { id: { in: ids } }
        });

        const results = {
            success: [],
            failed: []
        };

        for (const media of mediaList) {
            try {
                if (type === 'hard') {
                    // Check usage for hard delete
                    if (media.usedBy && media.status === 'active') {
                        throw new Error(`Media is in use by ${media.usageType}`);
                    }

                    await deleteFromImageKit(media.fileId);

                    await prisma.media.update({
                        where: { id: media.id },
                        data: { status: 'deleted' }
                    });
                } else {
                    // Soft delete
                    if (media.status === 'trashed') {
                        throw new Error('Already in trash');
                    }

                    const moveResult = await moveToTrash(media.fileId, media.filePath);

                    await prisma.media.update({
                        where: { id: media.id },
                        data: {
                            status: 'trashed',
                            trashedAt: new Date(),
                            trashedBy: req.user.id,
                            filePath: moveResult.newPath
                        }
                    });
                }
                results.success.push(media.id);
            } catch (error) {
                results.failed.push({ id: media.id, error: error.message });
            }
        }

        // Log batch activity
        if (results.success.length > 0) {
            await prisma.adminActivity.create({
                data: {
                    adminId: req.user.id,
                    action: type === 'hard' ? 'MEDIA_BATCH_HARD_DELETE' : 'MEDIA_BATCH_SOFT_DELETE',
                    entityType: 'Media',
                    entityId: 'batch',
                    changes: {
                        count: results.success.length,
                        ids: results.success,
                        type
                    },
                    ipAddress: req.ip
                }
            });
        }

        res.json({
            success: true,
            data: results,
            message: `Processed ${ids.length} items. Success: ${results.success.length}, Failed: ${results.failed.length}`
        });

    } catch (error) {
        logger.error('Batch delete error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Batch delete failed', details: error.message }
        });
    }
};

/**
 * Empty trash (permanently delete all trashed items)
 * DELETE /api/admin/media/trash/clear
 */
export const emptyTrash = async (req, res) => {
    try {
        const prisma = getPrisma();

        // Find all trashed items
        const trashedMedia = await prisma.media.findMany({
            where: { status: 'trashed' }
        });

        if (trashedMedia.length === 0) {
            return res.json({
                success: true,
                message: 'Trash is already empty'
            });
        }

        const results = {
            success: 0,
            failed: 0
        };

        for (const media of trashedMedia) {
            try {
                // Delete from ImageKit
                await deleteFromImageKit(media.fileId);

                // Mark as deleted in DB
                await prisma.media.update({
                    where: { id: media.id },
                    data: { status: 'deleted' }
                });

                results.success++;
            } catch (error) {
                logger.error(`Failed to empty trash item ${media.id}:`, error);
                results.failed++;
            }
        }

        // Log activity
        await prisma.adminActivity.create({
            data: {
                adminId: req.user.id,
                action: 'MEDIA_EMPTY_TRASH',
                entityType: 'Media',
                entityId: 'all',
                changes: {
                    count: results.success,
                    failed: results.failed
                },
                ipAddress: req.ip
            }
        });

        res.json({
            success: true,
            message: `Trash emptied. Deleted ${results.success} items. Failed: ${results.failed}`,
            data: results
        });

    } catch (error) {
        logger.error('Empty trash error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to empty trash', details: error.message }
        });
    }
};

/**
 * Sync media from database content
 * POST /api/admin/media/sync
 * Scans products, variants, etc. for images not in Media table
 */
export const syncMedia = async (req, res) => {
    try {
        const prisma = getPrisma();
        const { id: adminId } = req.user;

        // 1. Fetch all image URLs from content with their IDs
        const [products, categories, variants, reviews, banners] = await Promise.all([
            prisma.product.findMany({ select: { id: true, images: true } }),
            prisma.category.findMany({ select: { id: true, image: true } }),
            prisma.variant.findMany({ select: { id: true, images: true } }),
            prisma.review.findMany({ select: { id: true, images: true } }),
            prisma.promotionalBanner.findMany({ select: { id: true, imageUrl: true } })
        ]);

        // 2. Collect unique URLs with metadata (type, usedBy, usageType)
        const urlMap = new Map();

        const addUrl = (url, type, entityId) => {
            if (!url || typeof url !== 'string') return;
            if (!urlMap.has(url)) {
                urlMap.set(url, { type, usedBy: entityId, usageType: type });
            }
        };

        // Process each content type
        if (products) {
            products.forEach(p => {
                if (Array.isArray(p.images)) {
                    p.images.forEach(url => addUrl(url, 'product', p.id));
                }
            });
        }
        if (variants) {
            variants.forEach(v => {
                if (Array.isArray(v.images)) {
                    v.images.forEach(url => addUrl(url, 'variant', v.id));
                }
            });
        }
        if (reviews) {
            reviews.forEach(r => {
                if (Array.isArray(r.images)) {
                    r.images.forEach(url => addUrl(url, 'review', r.id));
                }
            });
        }
        if (categories) {
            categories.forEach(c => {
                if (c.image) addUrl(c.image, 'category', c.id);
            });
        }
        if (banners) {
            banners.forEach(b => {
                if (b.imageUrl) addUrl(b.imageUrl, 'banner', b.id);
            });
        }

        const uniqueUrls = Array.from(urlMap.keys());

        if (uniqueUrls.length === 0) {
            return res.json({ success: true, message: 'No images found to sync', data: { synced: 0 } });
        }

        // 3. Find existing Media records by URL
        const existingMedia = await prisma.media.findMany({
            where: { url: { in: uniqueUrls } },
            select: { url: true }
        });

        const existingUrls = new Set(existingMedia.map(m => m.url));
        const missingUrls = uniqueUrls.filter(url => !existingUrls.has(url));

        if (missingUrls.length === 0) {
            return res.json({ success: true, message: 'All images are already synced', data: { synced: 0 } });
        }

        // 4. Create Media records for missing URLs
        const newMediaRecords = missingUrls.map(url => {
            const metadata = urlMap.get(url);
            const isImageKit = url.includes('ik.imagekit.io');
            let fileName = 'unknown.jpg';
            let filePath = 'external';

            try {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                fileName = pathParts[pathParts.length - 1] || 'unknown.jpg';

                if (isImageKit) {
                    filePath = pathParts.slice(2).join('/') || fileName;
                } else {
                    filePath = urlObj.pathname;
                }
            } catch (e) {
                // Invalid URL, keep defaults
            }

            // Generate deterministic ID based on URL
            const urlHash = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

            return {
                fileId: isImageKit ? `legacy_${Date.now()}_${Math.random().toString(36).substring(2, 5)}` : `ext_${urlHash}`,
                fileName,
                filePath,
                url,
                type: metadata.type || 'general',
                mimeType: 'image/jpeg',
                size: 0,
                uploadedBy: adminId,
                usedBy: metadata.usedBy,
                usageType: metadata.usageType,
                status: 'active'
            };
        });

        await prisma.media.createMany({
            data: newMediaRecords,
            skipDuplicates: true
        });

        // Log activity
        await prisma.adminActivity.create({
            data: {
                adminId,
                action: 'MEDIA_SYNC',
                entityType: 'Media',
                entityId: 'batch',
                changes: { count: newMediaRecords.length },
                ipAddress: req.ip
            }
        });

        res.json({
            success: true,
            message: `Synced ${newMediaRecords.length} images`,
            data: { synced: newMediaRecords.length }
        });

    } catch (error) {
        logger.error('Sync media error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to sync media', details: error.message }
        });
    }
};

export default {
    listMedia,
    getTrash,
    softDelete,
    restore,
    hardDelete,
    batchDelete,
    emptyTrash,
    syncMedia
};
