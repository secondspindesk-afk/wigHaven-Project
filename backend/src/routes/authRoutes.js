import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, registerSchema, loginSchema, refreshTokenSchema, passwordResetRequestSchema, passwordResetConfirmSchema, changePasswordSchema, emailVerificationSchema } from '../utils/validators.js';
import { registerLimiter, loginLimiter, passwordResetLimiter, refreshTokenLimiter, checkEmailLimiter, resendVerificationLimiter, verifyEmailLimiter, changePasswordLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Authentication routes
 * All routes return consistent JSON format
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rateLimit 10 per hour per IP
 */
router.post(
    '/register',
    registerLimiter,
    validateRequest(registerSchema),
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT tokens
 * @access  Public
 * @rateLimit 5 per 15 minutes per IP
 */
router.post(
    '/login',
    loginLimiter,
    validateRequest(loginSchema),
    authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @rateLimit 10 per hour per IP
 */
router.post(
    '/refresh',
    refreshTokenLimiter,
    validateRequest(refreshTokenSchema),
    authController.refreshAccessToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and blacklist token
 * @access  Private
 */
router.post(
    '/logout',
    authenticateToken,
    authController.logout
);

/**
 * @route   POST /api/auth/password-reset/request
 * @desc    Request password reset email
 * @access  Public
 * @rateLimit 3 per hour per email
 */
router.post(
    '/password-reset/request',
    passwordResetLimiter,
    validateRequest(passwordResetRequestSchema),
    authController.requestPasswordReset
);

/**
 * @route   POST /api/auth/password-reset/confirm
 * @desc    Confirm password reset with token
 * @access  Public
 */
router.post(
    '/password-reset/confirm',
    validateRequest(passwordResetConfirmSchema),
    authController.confirmPasswordReset
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
    '/me',
    authenticateToken,
    authController.getCurrentUser
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
    '/change-password',
    authenticateToken,
    changePasswordLimiter,
    validateRequest(changePasswordSchema),
    authController.changePassword
);

/**
 * @route   POST /api/auth/verify-password
 * @desc    Verify current password (for re-authentication)
 * @access  Private
 */
router.post(
    '/verify-password',
    authenticateToken,
    changePasswordLimiter, // Reuse same limiter to prevent brute force
    authController.verifyPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post(
    '/verify-email',
    verifyEmailLimiter,
    validateRequest(emailVerificationSchema),
    authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public (user provides email, not logged in)
 * @rateLimit 3 per hour per email
 */
router.post(
    '/resend-verification',
    resendVerificationLimiter,
    authController.resendVerificationEmail
);

/**
 * @route   POST /api/auth/check-email
 * @desc    Check if email is available for registration
 * @access  Public
 * @rateLimit 20 per 15 minutes per IP
 */
router.post(
    '/check-email',
    checkEmailLimiter,
    authController.checkEmailAvailability
);

export default router;
