/**
 * Email Normalization Utility
 * 
 * Centralizes email normalization logic for consistent handling across the app.
 * Features:
 * - NFKC normalization for homoglyph protection (prevents look-alike attacks)
 * - Lowercase conversion
 * - Whitespace trimming
 * - Optional Gmail dot-removal (disabled by default)
 */

/**
 * Normalize an email address for safe storage and comparison.
 * Uses NFKC normalization to prevent homoglyph attacks (e.g., Cyrillic 'а' vs Latin 'a').
 * 
 * @param {string} email - Raw email address
 * @param {object} options - Normalization options
 * @param {boolean} options.removeGmailDots - If true, removes dots from Gmail local part (default: false)
 * @returns {string} Normalized email address
 * 
 * @example
 * normalizeEmail('  User@Example.COM  ') // 'user@example.com'
 * normalizeEmail('uѕer@example.com') // 'user@example.com' (Cyrillic 's' normalized)
 */
export const normalizeEmail = (email, options = {}) => {
    if (!email || typeof email !== 'string') {
        return '';
    }

    // 1. Trim whitespace
    let normalized = email.trim();

    // 2. NFKC normalization - converts look-alike characters to canonical form
    // This prevents homoglyph attacks (e.g., using Cyrillic letters that look like Latin)
    normalized = normalized.normalize('NFKC');

    // 3. Convert to lowercase
    normalized = normalized.toLowerCase();

    // 4. Optional: Remove dots from Gmail addresses (user.name = username)
    if (options.removeGmailDots) {
        const [localPart, domain] = normalized.split('@');
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
            normalized = `${localPart.replace(/\./g, '')}@${domain}`;
        }
    }

    return normalized;
};

/**
 * Compare two email addresses for equality after normalization.
 * 
 * @param {string} email1 - First email address
 * @param {string} email2 - Second email address
 * @returns {boolean} True if emails are equivalent after normalization
 * 
 * @example
 * emailsMatch('User@Example.com', 'user@example.com') // true
 * emailsMatch('user@gmail.com', 'USER@GMAIL.COM') // true
 */
export const emailsMatch = (email1, email2) => {
    return normalizeEmail(email1) === normalizeEmail(email2);
};

/**
 * Extract the domain from an email address.
 * 
 * @param {string} email - Email address
 * @returns {string|null} Domain portion of email, or null if invalid
 */
export const getEmailDomain = (email) => {
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes('@')) {
        return null;
    }
    return normalized.split('@')[1];
};

export default {
    normalizeEmail,
    emailsMatch,
    getEmailDomain
};
