import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { TooManyRequestsError } from './errorHandler.js';

/**
 * Rate limiting middleware using express-rate-limit
 * Uses in-memory store (efficient for single-server deployments)
 */

/**
 * Registration rate limiter
 * Limit: 10 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many registration attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for super admin
        return req.user && req.user.role === 'super_admin';
    },
    keyGenerator: (req) => {
        // Rate limit by IP address
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
    handler: (req, res, next) => {
        logger.warn(`Registration rate limit exceeded for IP: ${req.ip}`);
        next(new TooManyRequestsError('Too many registration attempts. Please try again in 1 hour.'));
    },
});

/**
 * Login rate limiter
 * Limit: 5 login attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many login attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
        // Rate limit by IP address
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
    handler: (req, res, next) => {
        logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
        next(new TooManyRequestsError('Too many login attempts. Please try again in 15 minutes.'));
    },
});

/**
 * Password reset request rate limiter
 * Limit: 3 requests per hour per email
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many password reset requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by email address
        const email = req.body.email || 'unknown';
        return `password-reset:${email}`;
    },
    handler: (req, res, next) => {
        logger.warn(`Password reset rate limit exceeded for email: ${req.body.email}`);
        next(new TooManyRequestsError('Too many password reset requests. Please try again in 1 hour.'));
    },
});

/**
 * General API rate limiter
 * Limit: 1000 requests per 15 minutes per IP (increased for development)
 * In production, consider lowering this value via RATE_LIMIT_MAX_REQUESTS env variable
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many requests. Please slow down.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health check
        if (req.path === '/api/health') return true;

        // Skip for super admin (check secret header since req.user isn't set yet)
        const superAdminSecret = process.env.SUPER_ADMIN_SECRET;
        const requestSecret = req.headers['x-super-admin-secret'];
        if (superAdminSecret && requestSecret === superAdminSecret) return true;

        // Skip for admin and super-admin routes (they have their own auth)
        if (req.path.startsWith('/api/admin')) return true;
        if (req.path.startsWith('/api/super-admin')) return true;

        // Skip for support routes (admins use these frequently)
        if (req.path.startsWith('/api/support')) return true;

        // Skip in development mode
        if (process.env.NODE_ENV === 'development') return true;

        return false;
    },
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
    handler: (req, res, next) => {
        // Only log in production to reduce noise
        if (process.env.NODE_ENV !== 'development') {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        }
        next(new TooManyRequestsError('Too many requests. Please try again later.'));
    },
});

/**
 * Token refresh rate limiter
 * Limit: 10 refresh requests per hour per IP
 */
export const refreshTokenLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many token refresh attempts.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
});

/**
 * Email availability check rate limiter
 * Limit: 20 checks per 15 minutes per IP (prevent email enumeration)
 */
export const checkEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many email check attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
});

/**
 * Resend verification email rate limiter
 * Limit: 3 requests per hour per email (same as password reset)
 */
export const resendVerificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many verification email requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by email address
        const email = req.body.email || 'unknown';
        return `resend-verification:${email}`;
    },
    handler: (req, res, next) => {
        next(new TooManyRequestsError('Too many verification email requests. Please try again in 1 hour.'));
    },
});

/**
 * Verify email rate limiter
 * Limit: 5 requests per hour per IP (To prevent brute force of tokens)
 */
export const verifyEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many verification attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },
});

/**
 * Change password rate limiter
 * Limit: 3 succesful changes per day (Prevent hijack looping)
 */
export const changePasswordLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // Allow a few retries
    message: {
        success: false,
        error: {
            type: 'TooManyRequests',
            message: 'Too many password change attempts. Please contact support.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by USER ID (since they are logged in)
        return req.user ? req.user.id : (req.ip || 'unknown');
    },
});

export default {
    registerLimiter,
    loginLimiter,
    passwordResetLimiter,
    generalLimiter,
    refreshTokenLimiter,
    checkEmailLimiter,
    resendVerificationLimiter,
    verifyEmailLimiter,
    changePasswordLimiter,
};
