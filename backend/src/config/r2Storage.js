/**
 * Cloudflare R2 Storage Configuration
 * 
 * S3-compatible cloud storage for database backups.
 * Uses streaming to avoid memory issues on 512MB server.
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import logger from '../utils/logger.js';

// R2 Configuration from environment
const R2_CONFIG = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME || 'wighaven-backups',
};

// S3 Client configured for Cloudflare R2
let r2Client = null;

/**
 * Get or create R2 client
 */
export const getR2Client = () => {
    if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey || !R2_CONFIG.accountId) {
        logger.warn('[R2] Missing R2 credentials - backup uploads disabled');
        return null;
    }

    if (!r2Client) {
        r2Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_CONFIG.accessKeyId,
                secretAccessKey: R2_CONFIG.secretAccessKey,
            },
        });
        logger.info('[R2] Client initialized');
    }

    return r2Client;
};

/**
 * Upload a stream to R2 (memory-safe)
 * Uses multipart upload for large files
 * 
 * @param {string} key - File name/path in bucket
 * @param {Stream} bodyStream - Readable stream of data
 * @param {string} contentType - MIME type
 * @returns {Promise<Object>} Upload result
 */
export const uploadStream = async (key, bodyStream, contentType = 'application/json') => {
    const client = getR2Client();
    if (!client) {
        throw new Error('R2 client not configured');
    }

    const upload = new Upload({
        client,
        params: {
            Bucket: R2_CONFIG.bucketName,
            Key: key,
            Body: bodyStream,
            ContentType: contentType,
        },
        // Memory-safe: upload in 5MB chunks
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', (progress) => {
        logger.debug(`[R2] Upload progress: ${progress.loaded} bytes`);
    });

    const result = await upload.done();
    logger.info(`[R2] Uploaded: ${key}`);
    return result;
};

/**
 * Upload a buffer/string directly (for small files)
 */
export const uploadBuffer = async (key, body, contentType = 'application/json') => {
    const client = getR2Client();
    if (!client) {
        throw new Error('R2 client not configured');
    }

    const command = new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
    });

    const result = await client.send(command);
    logger.info(`[R2] Uploaded: ${key}`);
    return result;
};

/**
 * List all backup files in bucket
 */
export const listBackups = async () => {
    const client = getR2Client();
    if (!client) {
        return [];
    }

    const command = new ListObjectsV2Command({
        Bucket: R2_CONFIG.bucketName,
        Prefix: 'backup-',
    });

    const result = await client.send(command);
    return result.Contents || [];
};

/**
 * Delete a backup file
 */
export const deleteBackup = async (key) => {
    const client = getR2Client();
    if (!client) {
        return;
    }

    const command = new DeleteObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
    });

    await client.send(command);
    logger.info(`[R2] Deleted: ${key}`);
};

/**
 * Cleanup old backups, keep only last N
 * @param {number} keep - Number of backups to keep (default 7)
 */
export const cleanupOldBackups = async (keep = 7) => {
    try {
        const backups = await listBackups();

        if (backups.length <= keep) {
            logger.info(`[R2] ${backups.length} backups, no cleanup needed`);
            return;
        }

        // Sort by date (newest first)
        const sorted = backups.sort((a, b) => b.LastModified - a.LastModified);
        const toDelete = sorted.slice(keep);

        for (const file of toDelete) {
            await deleteBackup(file.Key);
        }

        logger.info(`[R2] Cleaned up ${toDelete.length} old backups`);
    } catch (error) {
        logger.error('[R2] Cleanup failed:', error.message);
    }
};

/**
 * Check if R2 is configured and accessible
 */
export const isR2Configured = () => {
    return Boolean(
        R2_CONFIG.accessKeyId &&
        R2_CONFIG.secretAccessKey &&
        R2_CONFIG.accountId
    );
};

export default {
    getR2Client,
    uploadStream,
    uploadBuffer,
    listBackups,
    deleteBackup,
    cleanupOldBackups,
    isR2Configured,
};
