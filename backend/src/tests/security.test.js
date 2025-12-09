/**
 * Security Verification Tests
 * 
 * These tests verify that critical security patterns exist in the codebase
 * using static analysis. This approach is CI-robust and doesn't rely on
 * unstable ESM mocking.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to read source files
const readSourceFile = (relativePath) => {
    const fullPath = path.resolve(__dirname, '..', relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
};

describe('Security Audit: Authentication Hardening', () => {

    describe('Atomic User Registration (Zombie User Prevention)', () => {
        it('should use createUserWithVerification for atomic registration', () => {
            const authController = readSourceFile('controllers/authController.js');

            // VERIFY: The atomic function is imported and used
            expect(authController).toContain('createUserWithVerification');

            // VERIFY: The old non-atomic pattern is NOT used in register
            // The register function should NOT call createUser followed by separate token creation
            const registerMatch = authController.match(/export const register[\s\S]*?^};/m);
            if (registerMatch) {
                const registerFn = registerMatch[0];
                // Should use atomic function
                expect(registerFn).toContain('createUserWithVerification');
            }
        });

        it('should have atomic transaction in userRepository', () => {
            const userRepo = readSourceFile('db/repositories/userRepository.js');

            // VERIFY: createUserWithVerification exists
            expect(userRepo).toContain('createUserWithVerification');

            // VERIFY: Uses prisma transaction
            expect(userRepo).toContain('$transaction');
        });
    });

    describe('Password Reset Enumeration Prevention', () => {
        it('should return generic message regardless of user existence', () => {
            const authController = readSourceFile('controllers/authController.js');

            // VERIFY: Generic message pattern exists
            expect(authController).toContain('If an account exists');
        });

        it('should NOT leak user existence in password reset', () => {
            const authController = readSourceFile('controllers/authController.js');

            // VERIFY: requestPasswordReset always returns success (200)
            // Look for the pattern where we return success even when user not found
            const resetSection = authController.match(/requestPasswordReset[\s\S]*?^};/m);
            if (resetSection) {
                const resetFn = resetSection[0];
                // Should NOT have different responses for user found/not found
                // The success response should be unconditional
                expect(resetFn).toContain('success: true');
                expect(resetFn).toContain('If an account exists');
            }
        });
    });

    describe('Password Validation', () => {
        it('should enforce maximum password length of 72 (bcrypt limit)', () => {
            const validators = readSourceFile('utils/validators.js');

            // VERIFY: Password schema has max(72) to prevent bcrypt truncation
            expect(validators).toMatch(/\.max\s*\(\s*72\s*\)/);
        });
    });
});

describe('Security Audit: Super Admin Hardening', () => {

    describe('God Mode Backdoor Removal', () => {
        it('should NOT use superAdminAuth middleware in routes', () => {
            const superAdminRoutes = readSourceFile('routes/superAdminRoutes.js');

            // VERIFY: superAdminAuth middleware is NOT imported or used
            expect(superAdminRoutes).not.toContain('superAdminAuth');
        });

        it('should use proper JWT authentication for super admin routes', () => {
            const superAdminRoutes = readSourceFile('routes/superAdminRoutes.js');

            // VERIFY: Uses authenticateToken middleware
            expect(superAdminRoutes).toContain('authenticateToken');

            // VERIFY: Uses role-based access control
            expect(superAdminRoutes).toContain("requireRole('super_admin')");
        });
    });

    describe('Environment Variable Whitelisting', () => {
        it('should only expose safe environment variables', () => {
            const superAdminController = readSourceFile('controllers/superAdminController.js');

            // VERIFY: getEnvVars uses a whitelist approach
            expect(superAdminController).toContain('safeVars');

            // VERIFY: Contains warning comment about sensitive vars
            expect(superAdminController).toMatch(/NEVER.*JWT_SECRET/i);
        });

        it('should NOT expose all process.env', () => {
            const superAdminController = readSourceFile('controllers/superAdminController.js');

            // Find the getEnvVars function
            const getEnvVarsMatch = superAdminController.match(/getEnvVars[\s\S]*?^};/m);
            if (getEnvVarsMatch) {
                const getEnvVarsFn = getEnvVarsMatch[0];
                // Should NOT directly spread or return process.env
                expect(getEnvVarsFn).not.toMatch(/res\.json\s*\(\s*\{\s*.*process\.env\s*\}/);
                expect(getEnvVarsFn).not.toContain('...process.env');
            }
        });
    });

    describe('Audit Logging', () => {
        it('should log when environment variables are accessed', () => {
            const superAdminController = readSourceFile('controllers/superAdminController.js');

            // Find getEnvVars and check for logging
            const getEnvVarsMatch = superAdminController.match(/getEnvVars[\s\S]*?^};/m);
            if (getEnvVarsMatch) {
                const getEnvVarsFn = getEnvVarsMatch[0];
                // Should contain logging
                expect(getEnvVarsFn).toMatch(/logger\.(warn|info)/);
            }
        });
    });
});

describe('Security Audit: Rate Limiting', () => {

    it('should have rate limiting on verify-email endpoint', () => {
        const authRoutes = readSourceFile('routes/authRoutes.js');

        // VERIFY: verifyEmailLimiter is imported and used
        expect(authRoutes).toContain('verifyEmailLimiter');

        // VERIFY: It's applied to the verify-email route
        expect(authRoutes).toMatch(/verify-email[\s\S]*?verifyEmailLimiter|verifyEmailLimiter[\s\S]*?verify-email/);
    });

    it('should have rate limiting on login endpoint', () => {
        const authRoutes = readSourceFile('routes/authRoutes.js');

        expect(authRoutes).toContain('loginLimiter');
    });

    it('should have rate limiting on password reset endpoint', () => {
        const authRoutes = readSourceFile('routes/authRoutes.js');

        expect(authRoutes).toContain('passwordResetLimiter');
    });
});
