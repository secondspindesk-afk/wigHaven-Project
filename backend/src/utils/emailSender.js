import { Resend } from 'resend';
import logger from './logger.js';

let resendClient = null;

/**
 * Initialize Resend client
 * Uses Resend API (HTTPS) instead of SMTP - works on HuggingFace Spaces
 */
export const initializeTransporter = () => {
    if (!resendClient) {
        // DEBUG: Log Resend configuration
        logger.info(`[EMAIL DEBUG] Resend Configuration Check:`);
        logger.info(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '***SET*** (' + process.env.RESEND_API_KEY.length + ' chars)' : 'NOT SET'}`);
        logger.info(`  EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET (will use onboarding@resend.dev)'}`);

        // Check for API key
        if (!process.env.RESEND_API_KEY) {
            logger.error('❌ Resend not configured! RESEND_API_KEY is missing');
            logger.warn('⚠️  Emails will be logged but not sent.');
            return null;
        }

        resendClient = new Resend(process.env.RESEND_API_KEY);
        logger.info(`📧 Resend email client initialized`);

        // Note: Resend doesn't need a connection test like SMTP
        // It uses HTTPS which always works
        logger.info(`✅ Resend ready - using HTTPS API (no SMTP port blocking issues)`);
    }
    return resendClient;
};

/**
 * Send email directly using Resend
 * @param {Object} emailOptions - { to, subject, text, html }
 */
export const sendEmailDirectly = async (emailOptions) => {
    const client = initializeTransporter();

    // If Resend not configured, just log the email
    if (!client) {
        logger.info(`[EMAIL NOT SENT - NO RESEND] To: ${emailOptions.to}, Subject: ${emailOptions.subject}`);
        return { id: 'no-resend-configured' };
    }

    try {
        logger.info(`[EMAIL DEBUG] Attempting to send email to: ${emailOptions.to}`);

        // Determine the from address
        // If using Resend free tier without verified domain, use onboarding@resend.dev
        const fromAddress = process.env.EMAIL_FROM || 'WigHaven <onboarding@resend.dev>';

        logger.info(`[EMAIL DEBUG] Mail options: from=${fromAddress}, subject=${emailOptions.subject}`);

        const { data, error } = await client.emails.send({
            from: fromAddress,
            to: emailOptions.to,
            subject: emailOptions.subject,
            text: emailOptions.text,
            html: emailOptions.html,
        });

        if (error) {
            logger.error(`❌ Resend API error:`, error);
            throw new Error(error.message || 'Resend API error');
        }

        logger.info(`✅ Email sent to ${emailOptions.to} (ID: ${data.id})`);
        logger.info(`[EMAIL DEBUG] Resend response: ${JSON.stringify(data)}`);

        return { messageId: data.id, accepted: [emailOptions.to] };
    } catch (error) {
        logger.error(`❌ Failed to send email to ${emailOptions.to}`);
        logger.error(`[EMAIL DEBUG] Error Details:`);
        logger.error(`  Message: ${error.message}`);
        logger.error(`  Name: ${error.name || 'N/A'}`);

        if (error.message?.includes('API key')) {
            logger.error('  💡 FIX: Check your RESEND_API_KEY is valid');
        }
        if (error.message?.includes('domain')) {
            logger.error('  💡 FIX: Verify your domain in Resend dashboard, or use onboarding@resend.dev as FROM');
        }

        throw error;
    }
};

export default {
    initializeTransporter,
    sendEmailDirectly
};
