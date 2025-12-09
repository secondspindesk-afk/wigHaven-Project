import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// CRITICAL: Validate JWT_SECRET at startup
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        'FATAL: JWT_SECRET must be set in environment variables and be at least 32 characters long. ' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
}

// Warn if using default/weak secret
if (JWT_SECRET.includes('change') || JWT_SECRET.includes('secret') || JWT_SECRET.includes('example')) {
    logger.warn('⚠️  WARNING: JWT_SECRET appears to be a default/placeholder value. Use a strong random secret in production!');
}


/**
 * Generate JWT access token
 * @param {Object} payload - Token payload { sub, email, role }
 * @returns {string} - JWT token
 */
export const generateAccessToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            algorithm: 'HS256',
        });
    } catch (error) {
        logger.error('Failed to generate access token:', error);
        throw new Error('Token generation failed');
    }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload { sub }
 * @param {string} expiresIn - Token expiration (default: 7d)
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (payload, expiresIn = JWT_REFRESH_EXPIRES_IN) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: expiresIn,
            algorithm: 'HS256',
        });
    } catch (error) {
        logger.error('Failed to generate refresh token:', error);
        throw new Error('Token generation failed');
    }
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role
 * @param {boolean} rememberMe - Whether to extend refresh token expiration (default: false)
 * @returns {Object} - { accessToken, refreshToken }
 */
export const generateTokenPair = (userId, email, role, rememberMe = false) => {
    const accessTokenPayload = {
        sub: userId,
        email,
        role,
    };

    const refreshTokenPayload = {
        sub: userId,
    };

    // Standard: 7 days, Extended (Remember Me): 30 days
    const refreshTokenExpiry = rememberMe ? '30d' : JWT_REFRESH_EXPIRES_IN;

    return {
        accessToken: generateAccessToken(accessTokenPayload),
        refreshToken: generateRefreshToken(refreshTokenPayload, refreshTokenExpiry),
    };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw new Error('Token verification failed');
    }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token or null
 */
export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Failed to decode token:', error);
        return null;
    }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null
 */
export const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Generate secure random token (for password reset)
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Hex token
 */
export const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token (for storing reset tokens)
 * @param {string} token - Plain token
 * @returns {string} - Hashed token
 */
export const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Get token expiration time in seconds
 * @param {string} token - JWT token
 * @returns {number|null} - Seconds until expiration or null
 */
export const getTokenExpiration = (token) => {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp) {
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp - now;
    } catch (error) {
        return null;
    }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
export const isTokenExpired = (token) => {
    const expiration = getTokenExpiration(token);
    return expiration === null || expiration <= 0;
};

export default {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    extractTokenFromHeader,
    generateSecureToken,
    hashToken,
    getTokenExpiration,
    isTokenExpired,
};
