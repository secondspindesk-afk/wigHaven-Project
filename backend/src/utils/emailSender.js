import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter = null;

/**
 * Initialize email transporter
 * Always uses real SMTP from environment variables
 */
export const initializeTransporter = () => {
    if (!transporter) {
        // Validate required SMTP config
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            logger.warn('⚠️  SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
            logger.warn('⚠️  Emails will be logged but not sent.');
            return null;
        }

        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        logger.info(`📧 Email transporter initialized (${process.env.SMTP_HOST})`);
    }
    return transporter;
};

/**
 * Send email directly (bypassing queue)
 * Used by worker and as fallback for critical emails
 * @param {Object} emailOptions - { to, subject, text, html }
 */
export const sendEmailDirectly = async (emailOptions) => {
    const mailer = initializeTransporter();

    // If SMTP not configured, just log the email
    if (!mailer) {
        logger.info(`[EMAIL NOT SENT - NO SMTP] To: ${emailOptions.to}, Subject: ${emailOptions.subject}`);
        return { messageId: 'no-smtp-configured', accepted: [emailOptions.to] };
    }

    try {
        const info = await mailer.sendMail({
            from: process.env.EMAIL_FROM || 'WigHaven <noreply@wighaven.com>',
            to: emailOptions.to,
            subject: emailOptions.subject,
            text: emailOptions.text,
            html: emailOptions.html,
        });

        logger.info(`✅ Email sent to ${emailOptions.to} (ID: ${info.messageId})`);
        return info;
    } catch (error) {
        logger.error(`❌ Failed to send email to ${emailOptions.to}:`, error.message);
        throw error;
    }
};

export default {
    initializeTransporter,
    sendEmailDirectly
};
