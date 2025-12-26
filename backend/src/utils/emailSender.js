import logger from './logger.js';

let brevoApiKey = null;

/**
 * Initialize Brevo email client
 * Uses Brevo API (HTTPS) - works on HuggingFace Spaces
 */
export const initializeTransporter = () => {
    if (!brevoApiKey) {
        // DEBUG: Log Brevo configuration
        logger.info(`[EMAIL DEBUG] Brevo Configuration Check:`);
        logger.info(`  BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '***SET*** (' + process.env.BREVO_API_KEY.length + ' chars)' : 'NOT SET'}`);
        logger.info(`  EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET'}`);

        // Check for API key
        if (!process.env.BREVO_API_KEY) {
            logger.error('❌ Brevo not configured! BREVO_API_KEY is missing');
            logger.warn('⚠️  Emails will be logged but not sent.');
            return null;
        }

        if (!process.env.EMAIL_FROM) {
            logger.error('❌ EMAIL_FROM is required for Brevo (must be a verified sender)');
            logger.warn('⚠️  Emails will be logged but not sent.');
            return null;
        }

        brevoApiKey = process.env.BREVO_API_KEY;
        logger.info(`📧 Brevo email client initialized`);
        logger.info(`✅ Brevo ready - using HTTPS API (no SMTP port blocking issues)`);
    }
    return brevoApiKey;
};

/**
 * Send email directly using Brevo API
 * @param {Object} emailOptions - { to, subject, text, html }
 */
export const sendEmailDirectly = async (emailOptions) => {
    const apiKey = initializeTransporter();

    // If Brevo not configured, just log the email
    if (!apiKey) {
        logger.info(`[EMAIL NOT SENT - NO BREVO] To: ${emailOptions.to}, Subject: ${emailOptions.subject}`);
        return { messageId: 'no-brevo-configured' };
    }

    try {
        logger.info(`[EMAIL DEBUG] Attempting to send email to: ${emailOptions.to}`);

        // Get sender from settings
        const settingsService = (await import('../services/settingsService.js')).default;
        const siteName = await settingsService.getSetting('siteName') || 'WigHaven';

        const senderEmail = process.env.EMAIL_FROM;
        const senderName = process.env.EMAIL_FROM_NAME || siteName;


        logger.info(`[EMAIL DEBUG] Mail options: from=${senderName} <${senderEmail}>, subject=${emailOptions.subject}`);

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: senderName,
                    email: senderEmail
                },
                to: [{ email: emailOptions.to }],
                subject: emailOptions.subject,
                htmlContent: emailOptions.html,
                textContent: emailOptions.text || emailOptions.subject
            }),
        });

        const data = await response.json();

        if (response.ok) {
            logger.info(`✅ Email sent to ${emailOptions.to} (ID: ${data.messageId})`);
            logger.info(`[EMAIL DEBUG] Brevo response: ${JSON.stringify(data)}`);
            return { messageId: data.messageId, accepted: [emailOptions.to] };
        } else {
            logger.error(`❌ Brevo API error: ${response.status} ${response.statusText}`);
            logger.error(`[EMAIL DEBUG] Error response: ${JSON.stringify(data)}`);

            if (data.code === 'unauthorized') {
                logger.error('  💡 FIX: Check your BREVO_API_KEY is valid');
            }
            if (data.message?.includes('sender') || data.message?.includes('not found')) {
                logger.error('  💡 FIX: Verify your sender email in Brevo dashboard');
                logger.error('  💡 Go to: Settings > Senders, Domains, IPs > Senders');
            }

            throw new Error(data.message || `Brevo API error: ${response.status}`);
        }
    } catch (error) {
        logger.error(`❌ Failed to send email to ${emailOptions.to}`);
        logger.error(`[EMAIL DEBUG] Error Details:`);
        logger.error(`  Message: ${error.message}`);
        logger.error(`  Name: ${error.name || 'N/A'}`);
        throw error;
    }
};

export default {
    initializeTransporter,
    sendEmailDirectly
};
