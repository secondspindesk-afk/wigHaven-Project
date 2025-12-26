import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email template rendering service
 * Uses Handlebars for template rendering
 */

// Template cache
const templateCache = new Map();

/**
 * Load template from file
 * @param {string} templateName - Template name (without extension)
 * @returns {string} Template content
 */
const loadTemplate = (templateName) => {
    try {
        // Check cache first
        if (templateCache.has(templateName)) {
            return templateCache.get(templateName);
        }

        const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templateName}`);
        }

        const templateContent = fs.readFileSync(templatePath, 'utf8');

        // Cache template
        templateCache.set(templateName, templateContent);

        return templateContent;
    } catch (error) {
        logger.error(`Failed to load template ${templateName}:`, error);
        throw error;
    }
};

/**
 * Extract subject from HTML template
 * Looks for <title> tag or uses default
 * @param {string} html - HTML content
 * @param {string} defaultSubject - Default subject
 * @returns {string} Subject line
 */
const extractSubject = (html, defaultSubject = 'Notification') => {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1] : defaultSubject;
};

/**
 * Convert HTML to plain text (basic)
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
const htmlToText = (html) => {
    return html
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Render email template
 * @param {string} templateName - Template name
 * @param {Object} variables - Template variables
 * @returns {Promise<Object>} Rendered email content
 */
export const renderEmailTemplate = async (templateName, variables = {}) => {
    try {
        // Load the specific template content
        const templateContent = loadTemplate(templateName);

        // Compile the specific template content first
        // This allows using variables within the inner template
        const contentCompiler = Handlebars.compile(templateContent);
        const htmlBody = contentCompiler(variables);

        // Load the master layout
        let layoutContent;
        try {
            layoutContent = loadTemplate('layout');
        } catch (e) {
            // Fallback if layout doesn't exist (shouldn't happen in production if set up correctly)
            logger.warn('Layout template not found, rendering without layout');
            layoutContent = '{{{body}}}';
        }

        // Compile the layout with the body injected
        const layoutCompiler = Handlebars.compile(layoutContent);

        // Load system settings for defaults
        const settingsService = (await import('./settingsService.js')).default;
        const settings = await settingsService.getAllSettings();

        // Add current year helper if not present
        const mergedVariables = {
            site_name: settings.siteName,
            support_email: settings.supportEmail,
            currency_symbol: settings.currencySymbol,
            ...variables,
            body: htmlBody,
            current_year: new Date().getFullYear(),
            app_url: settings.siteUrl || process.env.FRONTEND_URL || 'http://localhost:3000',
            unsubscribe_url: variables.unsubscribe_url || `${settings.siteUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/account/profile`
        };

        const finalHtml = layoutCompiler(mergedVariables);

        // Extract subject
        // 1. Try variable
        // 2. Try to regex it from the raw content (if we want to keep that pattern, though it's less standard now)
        // 3. Default
        let subject = variables.subject;
        if (!subject) {
            // Try to find a comment-based subject in the raw template: <!-- SUBJECT: My Subject -->
            const subjectMatch = templateContent.match(/<!--\s*SUBJECT:\s*(.*?)\s*-->/);
            if (subjectMatch) {
                subject = subjectMatch[1];
            } else {
                subject = `${settings.siteName} Notification`;
            }
        }

        // Generate plain text version from the final HTML
        const text = htmlToText(finalHtml);

        return {
            html: finalHtml,
            text,
            subject,
        };
    } catch (error) {
        logger.error(`Failed to render template ${templateName}:`, error);

        // Try to get siteName for fallback
        let siteName = 'WigHaven';
        try {
            const settingsService = (await import('./settingsService.js')).default;
            siteName = await settingsService.getSetting('siteName') || 'WigHaven';
        } catch (e) { }

        // Return fallback
        return {
            html: `<p>Email content unavailable</p>`,
            text: 'Email content unavailable',
            subject: `${siteName} Notification`,
        };
    }
};

/**
 * Clear template cache
 * Useful for development when templates change
 */
export const clearTemplateCache = () => {
    templateCache.clear();
    logger.info('Email template cache cleared');
};

/**
 * Register Handlebars helpers
 */
Handlebars.registerHelper('formatCurrency', function (amount, options) {
    const symbol = options.data.root.currency_symbol || '₵';
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
});


Handlebars.registerHelper('formatDate', (date) => {
    return new Date(date).toLocaleDateString();
});

Handlebars.registerHelper('formatDateTime', (date) => {
    return new Date(date).toLocaleString();
});

export default {
    renderEmailTemplate,
    clearTemplateCache,
};
