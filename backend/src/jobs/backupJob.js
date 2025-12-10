import cron from 'node-cron';
import { PassThrough } from 'stream';
import { getPrisma } from '../config/database.js';
import { uploadStream, cleanupOldBackups, isR2Configured } from '../config/r2Storage.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';
import logger from '../utils/logger.js';
import zlib from 'zlib';

/**
 * Database Backup Job
 * Runs daily at midnight to backup database to Cloudflare R2
 * 
 * Uses STREAMING to avoid memory issues:
 * - Fetches data in batches (100 records at a time)
 * - Streams directly to R2 (never holds full backup in memory)
 * - Compresses with gzip (reduces size ~80%)
 * - Keeps last 7 days of backups
 */
export const startBackupJob = () => {
    // Daily at midnight: 0 0 * * *
    cron.schedule('0 0 * * *', async () => {
        await runBackup();
    });

    logger.info('[Backup Job] Scheduled for midnight daily');
};

/**
 * Run backup immediately (exposed for manual trigger)
 */
export const runBackup = async () => {
    const context = logJobStart('database_backup_r2');

    try {
        // Check if R2 is configured
        if (!isR2Configured()) {
            logger.warn('[Backup] R2 not configured - skipping backup');
            logJobComplete(context, {
                recordsProcessed: 0,
                details: 'R2 not configured - set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY',
            });
            return { success: false, reason: 'R2 not configured' };
        }

        const prisma = getPrisma();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.json.gz`;

        logger.info(`[Backup] Starting streaming backup: ${filename}`);

        // Create stream pipeline: JSON → Gzip → R2
        const passThrough = new PassThrough();
        const gzip = zlib.createGzip({ level: 6 });

        // Start upload in background (streaming)
        const uploadPromise = uploadStream(filename, passThrough.pipe(gzip), 'application/gzip');

        // Stream data in batches to avoid memory issues
        const stats = await streamBackupData(prisma, passThrough);

        // End stream and wait for upload
        passThrough.end();
        await uploadPromise;

        // Cleanup old backups (keep last 7)
        await cleanupOldBackups(7);

        logJobComplete(context, {
            recordsProcessed: stats.totalRecords,
            details: `Backup uploaded: ${filename} (${stats.tables.join(', ')})`,
        });

        logger.info(`[Backup] Complete: ${filename} - ${stats.totalRecords} records`);
        return { success: true, filename, stats };

    } catch (error) {
        logJobError(context, error);
        logger.error('[Backup] Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Stream backup data to output stream in batches
 * Uses cursor-based pagination to avoid loading everything at once
 */
async function streamBackupData(prisma, stream) {
    const stats = { totalRecords: 0, tables: [] };
    const BATCH_SIZE = 100;

    // Start JSON object
    stream.write('{\n');
    stream.write(`"createdAt": "${new Date().toISOString()}",\n`);
    stream.write(`"version": "1.0",\n`);

    // Tables to backup (in order of dependency)
    const tables = [
        { name: 'users', model: prisma.user, exclude: ['password'] },
        { name: 'categories', model: prisma.category },
        { name: 'products', model: prisma.product },
        { name: 'variants', model: prisma.variant },
        { name: 'orders', model: prisma.order },
        { name: 'orderItems', model: prisma.orderItem },
        { name: 'addresses', model: prisma.address },
        { name: 'reviews', model: prisma.review },
        { name: 'discountCodes', model: prisma.discountCode },
        { name: 'systemSettings', model: prisma.systemSetting },
        { name: 'promotionalBanners', model: prisma.promotionalBanner },
    ];

    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const isLast = i === tables.length - 1;

        try {
            // Stream this table's data
            const count = await streamTable(stream, table, BATCH_SIZE);
            stats.totalRecords += count;
            stats.tables.push(`${table.name}:${count}`);

            // Add comma if not last
            if (!isLast) {
                stream.write(',\n');
            }

            logger.debug(`[Backup] ${table.name}: ${count} records`);
        } catch (error) {
            logger.error(`[Backup] Error backing up ${table.name}:`, error.message);
            // Write empty array for failed table
            stream.write(`"${table.name}": []`);
            if (!isLast) stream.write(',\n');
        }
    }

    // End JSON object
    stream.write('\n}');

    return stats;
}

/**
 * Stream a single table's data in batches
 */
async function streamTable(stream, table, batchSize) {
    const { name, model, exclude = [] } = table;
    let cursor = null;
    let count = 0;
    let first = true;

    stream.write(`"${name}": [\n`);

    while (true) {
        // Fetch batch with cursor pagination
        const query = {
            take: batchSize,
            orderBy: { id: 'asc' },
        };

        if (cursor) {
            query.skip = 1;
            query.cursor = { id: cursor };
        }

        const batch = await model.findMany(query);

        if (batch.length === 0) break;

        // Write each record
        for (const record of batch) {
            // Remove excluded fields (like passwords)
            const cleanRecord = { ...record };
            exclude.forEach(field => delete cleanRecord[field]);

            // Add comma before record (except first)
            if (!first) stream.write(',\n');
            first = false;

            stream.write(JSON.stringify(cleanRecord));
            count++;
        }

        // Update cursor for next batch
        cursor = batch[batch.length - 1].id;

        // If batch is smaller than requested, we're done
        if (batch.length < batchSize) break;
    }

    stream.write('\n]');
    return count;
}

export default { startBackupJob, runBackup };
