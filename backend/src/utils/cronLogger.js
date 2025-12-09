import logger from './logger.js';

/**
 * Standardized logging for cron jobs
 * Provides consistent format and tracking for all automated jobs
 */

/**
 * Log cron job start
 * @param {string} jobName - Name of the cron job
 * @returns {Object} Job context with start time
 */
export const logJobStart = (jobName) => {
    const startTime = Date.now();
    logger.info(`[CRON] ${jobName} - Starting...`);

    return {
        jobName,
        startTime,
        recordsChecked: 0,
        recordsProcessed: 0,
        recordsFailed: 0,
    };
};

/**
 * Log cron job completion
 * @param {Object} context - Job context from logJobStart
 * @param {Object} stats - Job statistics
 */
export const logJobComplete = (context, stats = {}) => {
    const duration = Date.now() - context.startTime;
    const {
        recordsChecked = context.recordsChecked,
        recordsProcessed = context.recordsProcessed,
        recordsFailed = context.recordsFailed,
        details = null,
    } = stats;

    logger.info(
        `[CRON] ${context.jobName} - Completed | ` +
        `Checked: ${recordsChecked} | ` +
        `Processed: ${recordsProcessed} | ` +
        `Failed: ${recordsFailed} | ` +
        `Duration: ${duration}ms` +
        (details ? ` | ${details}` : '')
    );

    return {
        timestamp: new Date().toISOString(),
        jobName: context.jobName,
        status: 'completed',
        recordsChecked,
        recordsProcessed,
        recordsFailed,
        durationMs: duration,
        details,
    };
};

/**
 * Log cron job error
 * @param {Object} context - Job context from logJobStart
 * @param {Error} error - Error that occurred
 */
export const logJobError = (context, error) => {
    const duration = Date.now() - context.startTime;

    logger.error(
        `[CRON] ${context.jobName} - Failed | ` +
        `Duration: ${duration}ms | ` +
        `Error: ${error.message}`
    );

    return {
        timestamp: new Date().toISOString(),
        jobName: context.jobName,
        status: 'failed',
        durationMs: duration,
        error: error.message,
        stack: error.stack,
    };
};

/**
 * Log individual record processing error (non-fatal)
 * @param {string} jobName - Name of the cron job
 * @param {string} recordId - ID of the record that failed
 * @param {Error} error - Error that occurred
 */
export const logRecordError = (jobName, recordId, error) => {
    logger.warn(
        `[CRON] ${jobName} - Record ${recordId} failed: ${error.message}`
    );
};

export default {
    logJobStart,
    logJobComplete,
    logJobError,
    logRecordError,
};
