/**
 * Email validator utility
 * Validates email addresses before sending
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Check length
    if (email.length > 255) {
        return false;
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return false;
    }

    // Additional checks
    const [localPart, domain] = email.split('@');

    // Local part should not be empty
    if (!localPart || localPart.length === 0) {
        return false;
    }

    // Domain should have at least one dot
    if (!domain || !domain.includes('.')) {
        return false;
    }

    // Domain should not start or end with dot
    if (domain.startsWith('.') || domain.endsWith('.')) {
        return false;
    }

    return true;
};

/**
 * Validate email data before queueing
 * @param {Object} emailData - Email data
 * @returns {Object} Validation result
 */
export const validateEmailData = (emailData) => {
    const errors = [];

    if (!emailData.to_email) {
        errors.push('Recipient email is required');
    } else if (!isValidEmail(emailData.to_email)) {
        errors.push('Invalid recipient email format');
    }

    if (!emailData.type) {
        errors.push('Email type is required');
    }

    if (!emailData.template) {
        errors.push('Email template is required');
    }

    if (emailData.subject && emailData.subject.length > 255) {
        errors.push('Subject line too long (max 255 characters)');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export default {
    isValidEmail,
    validateEmailData,
};
