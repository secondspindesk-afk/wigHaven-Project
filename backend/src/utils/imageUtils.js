import { URL } from 'url';
import logger from './logger.js';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';

/**
 * Image Utilities
 * Helper functions for image URL manipulation, validation, and versioning
 */

/**
 * Generate versioned URL with timestamp parameter
 * Ensures cache is bypassed when image is updated
 * @param {string} baseUrl - ImageKit URL without version
 * @returns {string} URL with version parameter
 */
export const generateVersionedUrl = (baseUrl) => {
    try {
        const url = new URL(baseUrl);
        const version = Date.now();
        url.searchParams.set('v', version);
        return url.toString();
    } catch (error) {
        logger.error('Error generating versioned URL:', error);
        // Fallback: append as query param manually
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}v=${Date.now()}`;
    }
};

/**
 * Remove version parameter from URL
 * Useful when comparing or storing base URLs
 * @param {string} versionedUrl - URL with version parameter
 * @returns {string} Base URL without version
 */
export const getBaseUrl = (versionedUrl) => {
    try {
        const url = new URL(versionedUrl);
        url.searchParams.delete('v');
        return url.toString();
    } catch (error) {
        // If URL parsing fails, return as-is
        return versionedUrl;
    }
};

/**
 * Extract ImageKit file ID from URL
 * Format: https://ik.imagekit.io/yourId/path/file.jpg → extract from URL
 * @param {string} imagekitUrl - Full ImageKit URL
 * @returns {string|null} File ID or null if not found
 */
export const extractFileIdFromUrl = (imagekitUrl) => {
    try {
        // ImageKit URLs format: https://ik.imagekit.io/{urlEndpointId}/{filePath}
        // We need to use the ImageKit API to get fileId from URL path
        // For now, return the path portion which can be used with API
        const url = new URL(imagekitUrl);
        const pathSegments = url.pathname.split('/').filter(Boolean);

        // Remove the endpoint ID (first segment) and return the rest
        if (pathSegments.length > 1) {
            return pathSegments.slice(1).join('/');
        }

        return null;
    } catch (error) {
        logger.error('Error extracting file ID:', error);
        return null;
    }
};

/**
 * Validate if URL is a valid ImageKit URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid ImageKit URL
 */
export const isImageKitUrl = (url) => {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname === 'ik.imagekit.io';
    } catch {
        return false;
    }
};

/**
 * Validate external image URL
 * Checks format and security (prevents SSRF attacks)
 * @param {string} url - External URL to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateExternalImageUrl = (url) => {
    try {
        // Parse URL
        const parsedUrl = new URL(url);

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return {
                valid: false,
                error: 'Only HTTP and HTTPS URLs are allowed',
            };
        }

        // Block localhost and private IPs (SSRF prevention)
        const hostname = parsedUrl.hostname.toLowerCase();
        const blockedHosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1',
        ];

        if (blockedHosts.includes(hostname)) {
            return {
                valid: false,
                error: 'Local URLs are not allowed',
            };
        }

        // Block private IP ranges
        if (hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.') ||
            hostname.startsWith('172.17.') ||
            hostname.startsWith('172.18.') ||
            hostname.startsWith('172.19.') ||
            hostname.startsWith('172.2') ||
            hostname.startsWith('172.3')) {
            return {
                valid: false,
                error: 'Private network URLs are not allowed',
            };
        }

        // Validate image extension (optional but recommended)
        // Relaxed validation to allow dynamic URLs (e.g. Unsplash) that don't have extensions
        /*
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const pathname = parsedUrl.pathname.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));

        if (!hasValidExtension) {
            return {
                valid: false,
                error: 'URL must point to an image file (jpg, jpeg, png, gif, webp, bmp, svg)',
            };
        }
        */

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid URL format',
        };
    }
};

/**
 * Generate unique filename with timestamp
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'product', 'review')
 * @returns {string} Unique filename
 */
export const generateUniqueFilename = (originalName, prefix = '') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.split('.').slice(0, -1).join('.').replace(/[^a-z0-9]/gi, '-').toLowerCase();

    if (prefix) {
        return `${prefix}-${baseName}-${timestamp}-${random}.${extension}`;
    }

    return `${baseName}-${timestamp}-${random}.${extension}`;
};

/**
 * Get folder path for different image types
 * @param {string} type - Image type (product, review, variant, user, etc.)
 * @returns {string} Folder path
 */
export const getFolderPath = (type) => {
    const folderMap = {
        product: '/products',
        review: '/reviews',
        variant: '/variants',
        user: '/users',
        category: '/categories',
        banner: '/banners',
        temp: '/temp',
    };

    return folderMap[type] || '/';
};

/**
 * Validate image file size
 * @param {number} sizeInBytes - File size in bytes
 * @param {number} maxSizeMB - Maximum allowed size in MB
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateFileSize = (sizeInBytes, maxSizeMB = 5) => {
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (sizeInBytes > maxBytes) {
        return {
            valid: false,
            error: `File size exceeds ${maxSizeMB}MB limit`,
        };
    }

    return { valid: true };
};

/**
 * Validate file signature (magic bytes) to prevent file extension spoofing
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<{valid: boolean, detectedType?: string, error?: string}>}
 */
export const validateFileSignature = async (buffer) => {
    try {
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) {
            return { valid: false, error: 'Could not detect file type' };
        }

        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
        if (!allowedMimes.includes(fileType.mime)) {
            return {
                valid: false,
                error: `Invalid file type detected: ${fileType.mime}. Only images are allowed.`,
                detectedType: fileType.mime
            };
        }

        return { valid: true, detectedType: fileType.mime };
    } catch (error) {
        logger.error('File signature validation error:', error);
        return { valid: false, error: 'File validation failed' };
    }
};

/**
 * Generate SHA256 hash of file buffer for duplicate detection
 * @param {Buffer} buffer - File buffer
 * @returns {string} SHA256 hash
 */
export const generateFileHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Extract image dimensions from buffer using sharp
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = async (buffer) => {
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width,
            height: metadata.height
        };
    } catch (error) {
        logger.error('Error getting image dimensions:', error);
        throw new Error(`Failed to read image dimensions: ${error.message}`);
    }
};

/**
 * Validate image resolution (ImageKit free plan limit: 25MP)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} maxMegapixels - Maximum allowed megapixels (default 25)
 * @returns {Object} { valid: boolean, error?: string, megapixels: number }
 */
export const validateImageResolution = (width, height, maxMegapixels = 25) => {
    const megapixels = (width * height) / 1000000;

    if (megapixels > maxMegapixels) {
        const maxDimension = Math.floor(Math.sqrt(maxMegapixels * 1000000));
        return {
            valid: false,
            error: `Image resolution (${megapixels.toFixed(2)}MP) exceeds ${maxMegapixels}MP limit. Current: ${width}×${height}px. Maximum: ~${maxDimension}×${maxDimension}px. Please resize the image.`,
            megapixels
        };
    }

    return { valid: true, megapixels };
};

/**
 * Validate image MIME type
 * @param {string} mimetype - File MIME type
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateImageMimeType = (mimetype) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
    ];

    if (!allowedTypes.includes(mimetype.toLowerCase())) {
        return {
            valid: false,
            error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WEBP, BMP',
        };
    }

    return { valid: true };
};

export default {
    generateVersionedUrl,
    getBaseUrl,
    extractFileIdFromUrl,
    isImageKitUrl,
    validateExternalImageUrl,
    generateUniqueFilename,
    getFolderPath,
    validateFileSize,
    validateImageMimeType,
    validateFileSignature,
    generateFileHash,
    getImageDimensions,
    validateImageResolution,
};
