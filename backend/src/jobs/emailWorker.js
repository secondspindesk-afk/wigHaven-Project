import nodemailer from 'nodemailer';
import { initializeQueue, getQueue } from '../config/queue.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import { renderEmailTemplate } from '../services/emailTemplates.js';
import { isValidEmail } from '../utils/emailValidator.js';

const QUEUE_NAME = 'emails';

/**
 * Log email attempt to database
 */
const logEmailAttempt = async (emailData, status, result = {}) => {
    try {
        const prisma = getPrisma();

        await prisma.emailLog.create({
            data: {
                type: emailData.type,
                toEmail: emailData.toEmail || emailData.to_email,
                subject: emailData.subject || 'No subject',
                status,
                attemptCount: emailData.attemptCount || 1,
                maxAttempts: 3,
                lastError: result.error || null,
                messageId: result.messageId || null,
                templateData: result.templateData || null,
                sentAt: status === 'sent' ? new Date() : null,
            },
        });
    } catch (error) {
        logger.error('Failed to log email attempt:', error.message);
    }
};

/**
 * Process email job
 */
const processEmailJob = async (job) => {
    // Handle batch jobs (pg-boss may return array)
    let jobData = job;
    if (Array.isArray(job)) {
        if (job.length === 0) return;
        jobData = job[0];
    }

    const { type, toEmail, to_email, subject, template, variables } = jobData.data || {};
    const recipient = toEmail || to_email;

    if (!type || !recipient) {
        logger.error(`Invalid email job: missing type or recipient`);
        return;
    }

    try {
        // Validate email
        if (!isValidEmail(recipient)) {
            throw new Error(`Invalid email address: ${recipient}`);
        }

        // Render template
        const emailContent = await renderEmailTemplate(template, variables);

        // Send email using shared sender
        const { sendEmailDirectly } = await import('../utils/emailSender.js');

        const info = await sendEmailDirectly({
            to: recipient,
            subject: subject || emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
        });

        // Log success
        await logEmailAttempt(
            { ...jobData.data, attemptCount: 1 },
            'sent',
            {
                messageId: info.messageId,
                templateData: { template, variables }
            }
        );

        logger.info(`✅ Email sent: ${type} to ${recipient}`);

    } catch (error) {
        // Log failure
        await logEmailAttempt(
            { ...jobData.data, attemptCount: 1 },
            'failed',
            { error: error.message }
        );

        logger.error(`❌ Email failed: ${type} to ${recipient} - ${error.message}`);

        // Re-throw for pg-boss retry logic
        throw error;
    }
};

/**
 * Start email worker
 */
export const startEmailWorker = async () => {
    try {
        await initializeQueue();
        const boss = getQueue();

        logger.info('📧 Email Worker started');

        // Subscribe to the queue
        await boss.work(QUEUE_NAME, { teamSize: 5, newJobCheckInterval: 1000 }, processEmailJob);

    } catch (error) {
        logger.error('Failed to start Email Worker:', error.message);
    }
};

export const stopEmailWorker = async () => {
    // pg-boss stop is handled globally
};

export default {
    startEmailWorker,
    stopEmailWorker,
};
