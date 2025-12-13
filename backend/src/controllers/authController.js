import bcrypt from 'bcryptjs';
import { getPrisma } from '../config/database.js';
import * as userRepository from '../db/repositories/userRepository.js';
import { generateTokenPair, verifyToken, generateSecureToken, hashToken, getTokenExpiration } from '../utils/tokenUtils.js';
import { blacklistToken } from '../middleware/auth.js';
import * as emailService from '../services/emailService.js';
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError, ServiceUnavailableError } from '../middleware/errorHandler.js';
import cartService from '../services/cartService.js';
import logger from '../utils/logger.js';
import smartCache from '../utils/smartCache.js';

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * User registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
    try {
        const { email: rawEmail, password, firstName, lastName, phone } = req.body;
        // NORMALIZE: Force lowercase email with NFKC for homoglyph protection
        const email = rawEmail.normalize('NFKC').toLowerCase();

        // Check if user already exists
        const existingUser = await userRepository.findUserByEmail(email);
        if (existingUser) {
            if (!existingUser.emailVerified) {
                // Feature: Resend verification email if they try to register again
                try {
                    // Generate new token
                    const verificationToken = generateSecureToken(32);
                    const hashedVerificationToken = hashToken(verificationToken);

                    const prisma = getPrisma();
                    // Clean old tokens
                    await prisma.emailVerificationToken.deleteMany({
                        where: { userId: existingUser.id }
                    });

                    // Create new token
                    await prisma.emailVerificationToken.create({
                        data: {
                            userId: existingUser.id,
                            token: hashedVerificationToken,
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                        }
                    });

                    // Resend email
                    await emailService.sendVerificationEmail(existingUser.email, verificationToken);

                    return res.status(200).json({
                        success: true,
                        message: 'Account already exists but was not verified. A new verification link has been sent to your email.'
                    });
                } catch (resendError) {
                    logger.error('Failed to resend verification during duplicate registration:', resendError);
                    // Fallback to error message if resend fails
                    throw new ConflictError('Email already registered but not verified. Please check your inbox.');
                }
            }
            // User exists and is verified - suggest login instead
            return res.status(409).json({
                success: false,
                shouldLogin: true,
                error: {
                    message: 'This email is already registered. Please login instead.',
                    code: 'EMAIL_ALREADY_VERIFIED'
                }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate tokens for verification
        const verificationToken = generateSecureToken(32);
        const hashedVerificationToken = hashToken(verificationToken);

        // ATOMIC CREATION: Create user and verification token in one transaction
        // This prevents "zombie users" (created but validation token failed)
        const user = await userRepository.createUserWithVerification(
            {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: 'customer',
            },
            {
                token: hashedVerificationToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
        );

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user.id, user.email, user.role);

        // Send verification email (non-blocking)
        emailService.sendVerificationEmail(user.email, verificationToken).catch((error) => {
            logger.error('Failed to send verification email:', error);
        });

        // Send welcome email (non-blocking)
        emailService.sendWelcomeEmail(user).catch((error) => {
            logger.error('Failed to send welcome email:', error);
        });

        // Create welcome notification
        // We import notificationService dynamically to avoid circular dependencies
        const notificationService = (await import('../services/notificationService.js')).default;
        await notificationService.notifyWelcome(user);

        // 🔔 Real-time: Notify all admin dashboards of new user
        const { notifyUsersChanged } = await import('../utils/adminBroadcast.js');
        notifyUsersChanged({ action: 'registered', userId: user.id });

        logger.debug(`New user registered: ${user.email}`);

        res.status(201).json({
            success: true,
            data: {
                user,
                accessToken,
                refreshToken,
            },
        });

        // Merge guest cart if session ID exists (non-blocking)
        const sessionId = req.headers['x-session-id'];
        if (sessionId) {
            try {
                await cartService.mergeCarts(sessionId, user.id);
                logger.debug(`Cart merged for new user: ${user.email}`);
            } catch (err) {
                logger.error('Failed to merge carts on registration:', err);
                // Continue registration even if merge fails
            }
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Check email availability
 * POST /api/auth/check-email
 */
export const checkEmailAvailability = async (req, res, next) => {
    try {
        const { email } = req.body;
        // NORMALIZE: Force lowercase email with NFKC for homoglyph protection
        const normalizedEmail = email.normalize('NFKC').toLowerCase();

        // Check if email is already registered
        const existingUser = await userRepository.findUserByEmail(normalizedEmail);

        res.json({
            success: true,
            data: {
                available: !existingUser,
                message: existingUser ? 'Email is already registered' : 'Email is available'
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * User login
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
    try {
        const { email: rawEmail, password } = req.body;
        // NORMALIZE: Force lowercase email with NFKC for homoglyph protection
        const email = rawEmail.normalize('NFKC').toLowerCase();

        // Find user with password
        const user = await userRepository.findUserByEmail(email, true);

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Check if account is locked
        if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
            const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
            return res.status(423).json({
                success: false,
                error: { message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.` }
            });
        }

        // Check if account is active
        if (!user.isActive) {
            throw new UnauthorizedError('Account has been deactivated');
        }

        // Check if email is verified
        if (!user.emailVerified) {
            // Return structured error with hint for frontend to show resend option
            return res.status(401).json({
                success: false,
                needsVerification: true,
                email: user.email,
                error: {
                    message: 'Email not verified. Please check your inbox or resend the verification link.',
                    code: 'EMAIL_NOT_VERIFIED'
                }
            });
        }

        // Check for maintenance mode
        const prisma = getPrisma();
        const maintenanceSetting = await prisma.systemSetting.findFirst({
            where: {
                OR: [
                    { key: 'maintenance_mode' },
                    { key: 'maintenanceMode' }
                ]
            }
        });

        if (maintenanceSetting && maintenanceSetting.value === 'true') {
            // Only allow admins and super_admins to login during maintenance
            if (user.role !== 'admin' && user.role !== 'super_admin') {
                logger.debug(`[MAINTENANCE] Blocked login attempt for user ${email}`);
                throw new ServiceUnavailableError('System is currently under maintenance. Please try again later.');
            }
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Increment failed attempts
            await userRepository.incrementFailedAttempts(user.id);
            const attempts = (user.failedLoginAttempts || 0) + 1;

            if (attempts >= 5) {
                // Lock account for 15 minutes
                await userRepository.lockAccount(user.id, 15);
                return res.status(423).json({
                    success: false,
                    error: { message: 'Too many failed login attempts. Account locked for 15 minutes.' }
                });
            }

            throw new UnauthorizedError('Invalid email or password');
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await userRepository.resetFailedAttempts(user.id);
        }

        // Remove password from response
        const { password: _, failedLoginAttempts: __, lockedUntil: ___, ...userWithoutPassword } = user;

        // Check for "Remember Me" option (extended refresh token expiration)
        const rememberMe = req.body.rememberMe || false;

        // Generate tokens with extended expiration if rememberMe is true
        const { accessToken, refreshToken } = generateTokenPair(
            user.id,
            user.email,
            user.role,
            rememberMe // Pass rememberMe to generate longer-lived refresh token
        );

        logger.debug(`User logged in: ${user.email}`);

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                accessToken,
                refreshToken,
            },
        });

        // Merge guest cart if session ID exists (non-blocking)
        const sessionId = req.headers['x-session-id'];

        if (sessionId) {
            try {
                await cartService.mergeCarts(sessionId, user.id);
                logger.debug(`Cart merged for user: ${user.email}`);
            } catch (err) {
                logger.error('Failed to merge carts on login:', err);
                // Continue login even if merge fails
            }
        } else {
            logger.warn('[LOGIN] No session ID found in headers - skipping cart merge');
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new UnauthorizedError('Refresh token required');
        }

        // Verify refresh token
        const decoded = verifyToken(refreshToken);

        if (!decoded || !decoded.sub) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Get user to ensure they still exist and are active
        const user = await userRepository.findUserById(decoded.sub);

        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Account has been deactivated');
        }

        // Generate new token pair (Rotation)
        const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user.id, user.email, user.role);

        // Blacklist the old refresh token
        // Get expiration from the decoded token
        const expirationSeconds = decoded.exp - Math.floor(Date.now() / 1000);
        if (expirationSeconds > 0) {
            await blacklistToken(refreshToken, expirationSeconds);
        }

        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken: newRefreshToken
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
    try {
        const token = req.token; // Set by authenticateToken middleware

        if (token) {
            // Get token expiration time
            const expirationSeconds = getTokenExpiration(token);

            // Blacklist token
            // Blacklist token asynchronously - don't block response
            blacklistToken(token, expirationSeconds || 3600).catch(err =>
                logger.error('Background blacklist failed:', err)
            );
        }

        logger.info(`User logged out: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request password reset
 * POST /api/auth/password-reset/request
 */
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;
        // NORMALIZE: Force lowercase email with NFKC for homoglyph protection
        const normalizedEmail = email.normalize('NFKC').toLowerCase();

        // Find user
        const user = await userRepository.findUserByEmail(normalizedEmail);

        // Anti-Enumeration: Always return success message even if user doesn't exist
        // If user exists, we proceed with logic. If not, we just log and return.
        if (user && user.isActive) {
            // Generate reset token
            const resetToken = generateSecureToken(32);
            const hashedResetToken = hashToken(resetToken);

            // Store reset token in database
            const prisma = getPrisma();
            const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

            // FIX: Delete any existing reset tokens for this user (prevent race condition)
            await prisma.passwordResetToken.deleteMany({
                where: { userId: user.id }
            });

            await prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    token: hashedResetToken,
                    expiresAt
                }
            });

            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

            // Send password reset email
            await emailService.sendPasswordResetEmail(user.email, resetToken, resetLink);

            logger.info(`Password reset requested for: ${normalizedEmail}`);
        } else {
            logger.warn(`Password reset requested for invalid/inactive email: ${normalizedEmail}`);
        }

        // GENERIC RESPONSE for timing attack protection + enumeration prevention
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Confirm password reset
 * POST /api/auth/password-reset/confirm
 */
export const confirmPasswordReset = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        // Hash the token to match what's stored
        const hashedResetToken = hashToken(token);

        const prisma = getPrisma();

        // Find valid reset token
        const resetTokenRecord = await prisma.passwordResetToken.findFirst({
            where: {
                token: hashedResetToken,
                expiresAt: {
                    gte: new Date()
                }
            },
            include: {
                user: true
            }
        });

        if (!resetTokenRecord || !resetTokenRecord.user) {
            throw new ValidationError('Invalid or expired password reset token');
        }

        const user = resetTokenRecord.user;

        // SECURITY: Deactivated users cannot reset password
        if (!user.isActive) {
            // Clean up the token to prevent future attempts
            await prisma.passwordResetToken.deleteMany({
                where: { id: resetTokenRecord.id }
            });
            throw new UnauthorizedError('This account has been deactivated. Please contact support.');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update user password and auto-verify email (since they proved ownership)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                emailVerified: true,
                lastPasswordChange: new Date()
            }
        });

        // Delete used token (use deleteMany to avoid errors if already deleted)
        await prisma.passwordResetToken.deleteMany({
            where: { id: resetTokenRecord.id }
        });

        // Send confirmation email (non-blocking)
        emailService.sendPasswordChangedEmail(user.email, user.firstName).catch((error) => {
            logger.error('Failed to send password changed email:', error);
        });

        logger.info(`Password reset successful for: ${user.email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user
 * GET /api/auth/me
 */
/**
 * Get current user
 * GET /api/auth/me
 * Cached for 60 seconds to improve performance on navigation
 */
export const getCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user.id; // Set by authenticateToken middleware
        const cacheKey = `auth:me:${userId}`;

        // 1. Check Cache
        const cachedUser = smartCache.get(cacheKey);
        if (cachedUser) {
            return res.json({
                success: true,
                data: { user: cachedUser }
            });
        }

        // 2. Direct database fetch
        const user = await userRepository.findUserById(userId);

        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        // Check for maintenance mode
        const prisma = getPrisma();
        const maintenanceSetting = await prisma.systemSetting.findFirst({
            where: {
                OR: [
                    { key: 'maintenance_mode' },
                    { key: 'maintenanceMode' }
                ]
            }
        });

        if (maintenanceSetting && maintenanceSetting.value === 'true') {
            // Only allow admins and super_admins to access /me during maintenance
            if (user.role !== 'admin' && user.role !== 'super_admin') {
                logger.warn(`[MAINTENANCE] Force logout for user ${user.email}`);
                throw new UnauthorizedError('Maintenance Mode - Please login again later');
            }
        }

        // 3. Cache the result (Short TTL: 60s)
        // Short cache allows for relatively quick role/status updates while handling rapid navs
        smartCache.set(cacheKey, user, 60 * 1000); // smartCache uses ms

        res.json({
            success: true,
            data: {
                user,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get user with password
        const user = await userRepository.findUserById(userId, true);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Current password is incorrect');
        }

        // Check if new password is same as current
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new ValidationError('New password must be different from current password');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        // Update password and timestamp
        const prisma = getPrisma(); // Need prisma for complex update
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                lastPasswordChange: new Date()
            }
        });

        // Send confirmation email (non-blocking)
        emailService.sendPasswordChangedEmail(user.email, user.firstName).catch((error) => {
            logger.error('Failed to send password changed email:', error);
        });

        logger.info(`Password changed for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify password (for re-authentication)
 * POST /api/auth/verify-password
 * Used by Admin Profile to verify identity before sensitive operations
 */
export const verifyPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;

        if (!password) {
            throw new ValidationError('Password is required');
        }

        // Get user with password
        const user = await userRepository.findUserById(userId, true);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid password');
        }

        logger.info(`Password verified for: ${user.email}`);

        res.json({
            success: true,
            message: 'Password verified successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;

        // Hash the token to match what's stored
        const hashedToken = hashToken(token);

        const prisma = getPrisma();

        // Use transaction to ensure atomicity and prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
            // Find and DELETE the verification token in one atomic operation
            // This ensures only ONE request can successfully process this token
            const tokenRecord = await tx.emailVerificationToken.findFirst({
                where: {
                    token: hashedToken,
                    expiresAt: {
                        gte: new Date()
                    }
                },
                include: {
                    user: true
                }
            });

            if (!tokenRecord || !tokenRecord.user) {
                throw new ValidationError('Invalid or expired verification token');
            }

            const user = tokenRecord.user;

            // EDGE CASE: Banned users shouldn't be able to verify email
            if (!user.isActive) {
                throw new UnauthorizedError('Account has been deactivated. Operation not permitted.');
            }

            // Check if already verified BEFORE processing
            if (user.emailVerified) {
                // Token exists but user already verified - clean up the token silently
                await tx.emailVerificationToken.deleteMany({
                    where: { id: tokenRecord.id }
                });

                return { alreadyVerified: true, user };
            }

            // Delete the token FIRST to prevent concurrent requests from processing
            await tx.emailVerificationToken.deleteMany({
                where: { id: tokenRecord.id }
            });

            // Mark email as verified
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: { emailVerified: true }
            });

            return { alreadyVerified: false, user: updatedUser };
        });

        // Handle already verified case
        if (result.alreadyVerified) {
            return res.json({
                success: true,
                message: 'Email already verified',
            });
        }

        // Send email verified notification (OUTSIDE transaction)
        const notificationService = (await import('../services/notificationService.js')).default;
        await notificationService.notifyEmailVerified(result.user.id);

        logger.info(`Email verified for: ${result.user.email}`);

        res.json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ValidationError('Email is required');
        }
        // NORMALIZE: Force lowercase email with NFKC for homoglyph protection
        const normalizedEmail = email.normalize('NFKC').toLowerCase();

        // Find user by email
        const user = await userRepository.findUserByEmail(normalizedEmail);

        if (!user) {
            // UX-First: Inform user if account doesn't exist
            throw new NotFoundError('No account found with this email address');
        }

        // SECURITY: Deactivated users cannot resend verification - prevents email spam to banned accounts
        if (!user.isActive) {
            throw new UnauthorizedError('This account has been deactivated. Please contact support.');
        }

        // Check if already verified - user should login instead
        if (user.emailVerified) {
            return res.json({
                success: true,
                alreadyVerified: true,
                message: 'Your email is already verified. Please login to continue.',
                redirectTo: '/login'
            });
        }

        const prisma = getPrisma();

        // Delete existing verification tokens
        await prisma.emailVerificationToken.deleteMany({
            where: { userId: user.id }
        });

        // Generate new token
        const verificationToken = generateSecureToken(32);
        const hashedVerificationToken = hashToken(verificationToken);

        await prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                token: hashedVerificationToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
        });

        // Send verification email
        await emailService.sendVerificationEmail(user.email, verificationToken);

        logger.info(`Verification email resent for: ${normalizedEmail}`);

        res.json({
            success: true,
            message: 'Verification link sent successfully',
        });
    } catch (error) {
        next(error);
    }
};

export default {
    register,
    login,
    refreshAccessToken,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    getCurrentUser,
    changePassword,
    verifyPassword,
    verifyEmail,
    resendVerificationEmail,
    checkEmailAvailability,
};
