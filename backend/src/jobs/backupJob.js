import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Database Backup Job
 * Runs daily at 3 AM to trigger database backup
 * 
 * Note: This triggers an external backup service or command
 * For production, use managed backup services (AWS RDS, etc.)
 */
export const startBackupJob = () => {
    // Daily at 3 AM: 0 3 * * *
    cron.schedule('0 3 * * *', async () => {
        const context = logJobStart('database_backup');

        try {
            const backupMethod = process.env.BACKUP_METHOD || 'log_only';

            if (backupMethod === 'pg_dump') {
                // Option A: Use pg_dump command
                const databaseUrl = process.env.DATABASE_URL;
                const backupPath = process.env.BACKUP_PATH || '/tmp/backup';
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `${backupPath}/backup-${timestamp}.sql`;

                const command = `pg_dump ${databaseUrl} > ${filename}`;
                await execAsync(command);

                logger.info(`Database backup created: ${filename}`);
            } else if (backupMethod === 'http') {
                // Option B: Call external backup service
                const backupUrl = process.env.BACKUP_SERVICE_URL;

                if (!backupUrl) {
                    throw new Error('BACKUP_SERVICE_URL not configured');
                }

                const response = await fetch(backupUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.BACKUP_SERVICE_TOKEN}`,
                    },
                    body: JSON.stringify({
                        database: 'wighaven',
                        timestamp: new Date().toISOString(),
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Backup service returned ${response.status}`);
                }

                logger.info('Database backup triggered via HTTP');
            } else {
                // Option C: Log only (for development or managed services)
                logger.info('Database backup: Using managed service (AWS RDS, etc.)');
            }

            logJobComplete(context, {
                recordsChecked: 1,
                recordsProcessed: 1,
                recordsFailed: 0,
                details: `Backup method: ${backupMethod}`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};
