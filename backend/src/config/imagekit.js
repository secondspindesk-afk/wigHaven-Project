import ImageKit from 'imagekit';
import logger from '../utils/logger.js';

/**
 * ImageKit Configuration
 * Cloud storage for product images, review images, and all media assets
 */

let imagekitInstance = null;

/**
 * Initialize ImageKit client
 */
export const getImageKit = () => {
    if (!imagekitInstance) {
        try {
            imagekitInstance = new ImageKit({
                publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
                privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
                urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
            });
            logger.info('✓ ImageKit client initialized');
        } catch (error) {
            logger.error('Failed to initialize ImageKit:', error);
            throw new Error('ImageKit initialization failed');
        }
    }
    return imagekitInstance;
};

/**
 * Upload file to ImageKit
 * @param {Buffer|string} file - File buffer or base64 string
 * @param {string} fileName - Desired filename
 * @param {string} folder - Folder path (e.g., '/products', '/reviews')
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result with url, fileId, etc.
 */
export const uploadToImageKit = async (file, fileName, folder = '/', options = {}) => {
    try {
        const imagekit = getImageKit();

        const uploadOptions = {
            file,
            fileName,
            folder,
            useUniqueFileName: options.useUniqueFileName !== undefined ? options.useUniqueFileName : true,
            tags: options.tags || [],
            ...options,
        };

        const result = await imagekit.upload(uploadOptions);

        logger.info(`Image uploaded to ImageKit: ${result.url}`);
        return result;
    } catch (error) {
        logger.error('ImageKit upload error:', error);
        throw new Error(`Failed to upload to ImageKit: ${error.message}`);
    }
};

/**
 * Upload from URL to ImageKit
 * @param {string} sourceUrl - External image URL
 * @param {string} fileName - Desired filename
 * @param {string} folder - Folder path
 * @returns {Promise<Object>} Upload result
 */
export const uploadFromUrl = async (sourceUrl, fileName, folder = '/') => {
    try {
        const imagekit = getImageKit();

        const result = await imagekit.upload({
            file: sourceUrl,
            fileName,
            folder,
            useUniqueFileName: true,
        });

        logger.info(`Image uploaded from URL to ImageKit: ${result.url}`);
        return result;
    } catch (error) {
        logger.error('ImageKit URL upload error:', error);
        throw new Error(`Failed to upload from URL: ${error.message}`);
    }
};

/**
 * Delete file from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise<void>}
 */
export const deleteFromImageKit = async (fileId) => {
    try {
        const imagekit = getImageKit();
        await imagekit.deleteFile(fileId);
        logger.info(`Image deleted from ImageKit: ${fileId}`);
    } catch (error) {
        logger.error('ImageKit delete error:', error);
        throw new Error(`Failed to delete from ImageKit: ${error.message}`);
    }
};

/**
 * Purge cache for specific URL
 * Ensures updated images are fetched immediately
 * @param {string} url - Full ImageKit URL to purge
 * @returns {Promise<Object>} Purge result with requestId
 */
export const purgeCacheForUrl = async (url) => {
    try {
        const imagekit = getImageKit();
        const result = await imagekit.purgeCache(url);
        logger.info(`Cache purged for URL: ${url}`);
        return result;
    } catch (error) {
        logger.error('Cache purge error:', error);
        // Don't throw - cache purge failure shouldn't break the upload flow
        logger.warn('Cache purge failed, but continuing...');
        return { success: false, error: error.message };
    }
};

/**
 * Batch purge multiple URLs
 * @param {string[]} urls - Array of ImageKit URLs
 * @returns {Promise<Object[]>} Array of purge results
 */
export const batchPurgeCache = async (urls) => {
    try {
        const results = await Promise.allSettled(
            urls.map(url => purgeCacheForUrl(url))
        );
        return results;
    } catch (error) {
        logger.error('Batch cache purge error:', error);
        return [];
    }
};

/**
 * Get file details from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise<Object>} File details
 */
export const getFileDetails = async (fileId) => {
    try {
        const imagekit = getImageKit();
        const details = await imagekit.getFileDetails(fileId);
        return details;
    } catch (error) {
        logger.error('Get file details error:', error);
        throw new Error(`Failed to get file details: ${error.message}`);
    }
};

/**
 * Move file to trash by renaming its path
 * ImageKit doesn't have a native move API, so we use rename to change the file path
 * @param {string} fileId - ImageKit file ID
 * @param {string} currentPath - Current file path (e.g., '/products/image.jpg')
 * @returns {Promise<Object>} Rename result
 */
export const moveToTrash = async (fileId, currentPath) => {
    try {
        const imagekit = getImageKit();
        const fileName = currentPath.split('/').pop();
        const newFileName = `trashed-${Date.now()}-${fileName}`;

        // Use ImageKit's renameFile API to move to trash folder
        await imagekit.renameFile({
            filePath: currentPath,
            newFileName: newFileName,
            purgeCache: true
        });

        const newPath = `/trashed/${newFileName}`;
        logger.info(`File moved to trash: ${currentPath} → ${newPath}`);
        return { success: true, newPath };
    } catch (error) {
        logger.error('Move to trash error:', error);
        throw new Error(`Failed to move to trash: ${error.message}`);
    }
};

/**
 * Restore file from trash by renaming back to original folder
 * @param {string} fileId - ImageKit file ID
 * @param {string} trashedPath - Current path in trash (e.g., '/trashed/file.jpg')
 * @param {string} originalFolder - Original folder to restore to (e.g., '/products')
 * @returns {Promise<Object>} Rename result
 */
export const restoreFromTrash = async (fileId, trashedPath, originalFolder) => {
    try {
        const imagekit = getImageKit();
        const fileName = trashedPath.split('/').pop().replace(/^trashed-\d+-/, ''); // Remove 'trashed-timestamp-' prefix
        const newPath = `${originalFolder}/${fileName}`;

        await imagekit.renameFile({
            filePath: trashedPath,
            newFileName: fileName,
            purgeCache: true
        });

        logger.info(`File restored from trash: ${trashedPath} → ${newPath}`);
        return { success: true, newPath };
    } catch (error) {
        logger.error('Restore from trash error:', error);
        throw new Error(`Failed to restore from trash: ${error.message}`);
    }
};

/**
 * List files in ImageKit with optional filters
 * @param {Object} options - Filter options
 * @param {string} options.path - Folder path to list (e.g., '/products')
 * @param {string} options.searchQuery - Lucene-like search query
 * @param {number} options.skip - Number of files to skip (for pagination)
 * @param {number} options.limit - Max files to return (default 100, max 1000)
 * @param {string} options.sort - Sort field (e.g., 'ASC_CREATED', 'DESC_CREATED')
 * @returns {Promise<Array>} Array of file objects
 */
export const listFiles = async (options = {}) => {
    try {
        const imagekit = getImageKit();
        const params = {
            path: options.path || '/',
            skip: options.skip || 0,
            limit: Math.min(options.limit || 100, 1000),
            sort: options.sort || 'DESC_CREATED',
            includeFolder: true, // Include folders in listing
        };

        if (options.searchQuery) {
            params.searchQuery = options.searchQuery;
        }

        if (options.type) {
            params.type = options.type; // 'file', 'folder', or 'all'
        }

        const files = await imagekit.listFiles(params);
        logger.debug(`Listed ${files.length} files from path: ${params.path}`);
        return files;
    } catch (error) {
        logger.error('List files error:', error);
        throw new Error(`Failed to list files: ${error.message}`);
    }
};

/**
 * Create a folder in ImageKit
 * @param {string} folderName - Name of the folder to create
 * @param {string} parentFolderPath - Parent folder path (e.g., '/' for root)
 * @returns {Promise<Object>} Result object
 */
export const createFolder = async (folderName, parentFolderPath = '/') => {
    try {
        const imagekit = getImageKit();
        const result = await imagekit.createFolder({
            folderName,
            parentFolderPath
        });
        logger.info(`Folder created: ${parentFolderPath}/${folderName}`);
        return result;
    } catch (error) {
        logger.error('Create folder error:', error);
        throw new Error(`Failed to create folder: ${error.message}`);
    }
};

/**
 * Delete a folder from ImageKit (and all its contents)
 * @param {string} folderPath - Full path of folder to delete
 * @returns {Promise<Object>} Result object
 */
export const deleteFolder = async (folderPath) => {
    try {
        const imagekit = getImageKit();
        const result = await imagekit.deleteFolder(folderPath);
        logger.info(`Folder deleted: ${folderPath}`);
        return result;
    } catch (error) {
        logger.error('Delete folder error:', error);
        throw new Error(`Failed to delete folder: ${error.message}`);
    }
};

/**
 * Move a file to a different folder
 * @param {string} sourceFilePath - Current file path
 * @param {string} destinationPath - Destination folder path
 * @returns {Promise<Object>} Result object
 */
export const moveFile = async (sourceFilePath, destinationPath) => {
    try {
        const imagekit = getImageKit();
        const result = await imagekit.moveFile({
            sourceFilePath,
            destinationPath
        });
        logger.info(`File moved: ${sourceFilePath} → ${destinationPath}`);
        return result;
    } catch (error) {
        logger.error('Move file error:', error);
        throw new Error(`Failed to move file: ${error.message}`);
    }
};

/**
 * Copy a file to a different folder
 * @param {string} sourceFilePath - Current file path
 * @param {string} destinationPath - Destination folder path
 * @param {boolean} includeFileVersions - Include all versions of the file
 * @returns {Promise<Object>} Result object
 */
export const copyFile = async (sourceFilePath, destinationPath, includeFileVersions = false) => {
    try {
        const imagekit = getImageKit();
        const result = await imagekit.copyFile({
            sourceFilePath,
            destinationPath,
            includeFileVersions
        });
        logger.info(`File copied: ${sourceFilePath} → ${destinationPath}`);
        return result;
    } catch (error) {
        logger.error('Copy file error:', error);
        throw new Error(`Failed to copy file: ${error.message}`);
    }
};

/**
 * Bulk delete files
 * @param {string[]} fileIds - Array of file IDs to delete
 * @returns {Promise<Object>} Result with success/failure counts
 */
export const bulkDeleteFiles = async (fileIds) => {
    try {
        const imagekit = getImageKit();
        const result = await imagekit.bulkDeleteFiles(fileIds);
        logger.info(`Bulk deleted ${fileIds.length} files`);
        return result;
    } catch (error) {
        logger.error('Bulk delete error:', error);
        throw new Error(`Failed to bulk delete files: ${error.message}`);
    }
};

export default {
    getImageKit,
    uploadToImageKit,
    uploadFromUrl,
    deleteFromImageKit,
    purgeCacheForUrl,
    batchPurgeCache,
    getFileDetails,
    moveToTrash,
    restoreFromTrash,
    listFiles,
    createFolder,
    deleteFolder,
    moveFile,
    copyFile,
    bulkDeleteFiles,
};
