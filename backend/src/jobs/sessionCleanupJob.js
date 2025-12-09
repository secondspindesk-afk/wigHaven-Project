import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';

/**
 * Session Cleanup Job
 * Runs daily at 2:00 AM to delete expired tokens
 */
export const startSessionCleanupJob = () => {
    // Daily at 2:00 AM: 0 2 * * *
    cron.schedule('0 2 * * *', async () => {
        const context = logJobStart('session_cleanup');

        try {
            const prisma = getPrisma();
            const now = new Date();

            // 1. Delete expired Blacklisted Tokens (JWTs)
            const blacklistedResult = await prisma.blacklistedToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: now,
                    },
                },
            });

            // 2. Delete expired Password Reset Tokens
            const passwordResetResult = await prisma.passwordResetToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: now,
                    },
                },
            });

            // 3. Delete expired Email Verification Tokens
            const emailVerificationResult = await prisma.emailVerificationToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: now,
                    },
                },
            });

            const totalDeleted = blacklistedResult.count + passwordResetResult.count + emailVerificationResult.count;

            logJobComplete(context, {
                recordsChecked: totalDeleted, // We don't know how many checked, but this is a good proxy
                recordsProcessed: totalDeleted,
                recordsFailed: 0,
                details: `Deleted ${blacklistedResult.count} blacklisted tokens, ${passwordResetResult.count} reset tokens, ${emailVerificationResult.count} verification tokens`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};
