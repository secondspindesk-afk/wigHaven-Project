import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import { getPrisma } from './database.js';
import { sendEmailDirectly } from '../utils/emailSender.js';
import { renderEmailTemplate } from '../services/emailTemplates.js';
import { isValidEmail } from '../utils/emailValidator.js';

/**
 * Simple In-Memory Email Queue
 * 
 * Replaces PgBoss to eliminate database connection pool issues.
 * 
 * Features:
 * - Async processing (non-blocking)
 * - Retry with exponential backoff (3 attempts)
 * - Concurrency control (5 concurrent)
 * - Error logging to EmailLog table
 * - Graceful shutdown
 * 
 * Limitation: Jobs lost on server restart (acceptable for emails)
 */

class SimpleEmailQueue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.processing = 0;
        this.maxConcurrency = 5;
        this.maxRetries = 3;
        this.maxQueueSize = 1000;
        this.isShuttingDown = false;
        this.processedCount = 0;
        this.failedCount = 0;

        // Start processing when items are added
        this.on('added', () => this.processNext());
    }

    /**
     * Add email job to queue
     */
    add(emailData, options = {}) {
        if (this.isShuttingDown) {
            logger.warn('[EmailQueue] Queue is shutting down, job rejected');
            return false;
        }

        if (this.queue.length >= this.maxQueueSize) {
            logger.warn('[EmailQueue] Queue full, job rejected');
            return false;
        }

        const job = {
            id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: emailData,
            attempts: 0,
            maxAttempts: options.retries || this.maxRetries,
            createdAt: new Date(),
        };

        this.queue.push(job);
        logger.debug(`[EmailQueue] Job added: ${job.id} (queue size: ${this.queue.length})`);

        this.emit('added', job);
        return job.id;
    }

    /**
     * Process next job in queue
     */
    async processNext() {
        // Check concurrency limit
        if (this.processing >= this.maxConcurrency) {
            return;
        }

        // Get next job
        const job = this.queue.shift();
        if (!job) {
            return;
        }

        this.processing++;

        try {
            await this.processJob(job);
            this.processedCount++;
        } catch (error) {
            // Retry logic
            job.attempts++;
            if (job.attempts < job.maxAttempts) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, job.attempts - 1) * 1000;
                logger.info(`[EmailQueue] Retrying ${job.id} in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`);

                setTimeout(() => {
                    this.queue.push(job);
                    this.emit('added');
                }, delay);
            } else {
                this.failedCount++;
                logger.error(`[EmailQueue] Job ${job.id} failed permanently after ${job.maxAttempts} attempts`);
            }
        } finally {
            this.processing--;

            // Process next immediately
            setImmediate(() => this.processNext());
        }
    }

    /**
     * Process a single email job
     */
    async processJob(job) {
        const { type, toEmail, to_email, subject, template, variables } = job.data;
        const recipient = toEmail || to_email;

        if (!type || !recipient) {
            throw new Error(`Invalid email job: missing type or recipient`);
        }

        // Validate email
        if (!isValidEmail(recipient)) {
            await this.logEmailAttempt(job.data, 'failed', { error: `Invalid email: ${recipient}` });
            throw new Error(`Invalid email address: ${recipient}`);
        }

        // Render template
        const emailContent = await renderEmailTemplate(template, variables);

        // Send email
        const info = await sendEmailDirectly({
            to: recipient,
            subject: subject || emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
        });

        // Log success
        await this.logEmailAttempt(job.data, 'sent', {
            messageId: info.messageId,
            templateData: { template, variables }
        });

        logger.info(`✅ Email sent: ${type} to ${recipient}`);
    }

    /**
     * Log email attempt to database
     */
    async logEmailAttempt(emailData, status, result = {}) {
        try {
            const prisma = getPrisma();

            await prisma.emailLog.create({
                data: {
                    type: emailData.type,
                    toEmail: emailData.toEmail || emailData.to_email,
                    subject: emailData.subject || 'No subject',
                    status,
                    attemptCount: 1,
                    maxAttempts: this.maxRetries,
                    lastError: result.error || null,
                    messageId: result.messageId || null,
                    templateData: result.templateData || null,
                    sentAt: status === 'sent' ? new Date() : null,
                },
            });
        } catch (error) {
            logger.error('[EmailQueue] Failed to log email attempt:', error.message);
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            processed: this.processedCount,
            failed: this.failedCount,
        };
    }

    /**
     * Graceful shutdown - wait for in-progress jobs
     */
    async shutdown() {
        this.isShuttingDown = true;
        logger.info(`[EmailQueue] Shutting down... (${this.processing} jobs in progress, ${this.queue.length} pending)`);

        // Wait for in-progress jobs (max 30 seconds)
        const timeout = Date.now() + 30000;
        while (this.processing > 0 && Date.now() < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.queue.length > 0) {
            logger.warn(`[EmailQueue] ${this.queue.length} jobs discarded on shutdown`);
        }

        logger.info('[EmailQueue] Shutdown complete');
    }
}

// Singleton instance
const emailQueue = new SimpleEmailQueue();

/**
 * Queue an email for async sending
 * Drop-in replacement for PgBoss boss.send('emails', data)
 */
export const queueEmail = (emailData, options = {}) => {
    return emailQueue.add(emailData, options);
};

/**
 * Get queue instance (for stats, etc.)
 */
export const getEmailQueue = () => emailQueue;

/**
 * Shutdown queue gracefully
 */
export const shutdownEmailQueue = () => emailQueue.shutdown();

export default emailQueue;
