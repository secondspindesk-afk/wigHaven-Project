import { jest } from '@jest/globals';

// Mock dependencies
const mockUserRepository = {
    findUserByEmail: jest.fn(),
    createUserWithVerification: jest.fn(),
    createUser: jest.fn(),
};

const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
};

const mockPrisma = {
    emailVerificationToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
    },
    passwordResetToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
    },
    $transaction: jest.fn(),
};

jest.unstable_mockModule('../db/repositories/userRepository.js', () => mockUserRepository);
jest.unstable_mockModule('../services/emailService.js', () => mockEmailService);
jest.unstable_mockModule('../config/database.js', () => ({
    getPrisma: () => mockPrisma,
}));
jest.unstable_mockModule('../services/notificationService.js', () => ({
    default: {
        notifyWelcome: jest.fn().mockResolvedValue(true),
        notifyEmailVerified: jest.fn().mockResolvedValue(true),
    }
}));
jest.unstable_mockModule('../services/cartService.js', () => ({
    default: {
        mergeCarts: jest.fn().mockResolvedValue(true),
    }
}));
jest.unstable_mockModule('../utils/tokenUtils.js', () => ({
    generateTokenPair: jest.fn().mockReturnValue({ accessToken: 'access', refreshToken: 'refresh' }),
    verifyToken: jest.fn(),
    generateSecureToken: jest.fn().mockReturnValue('secure-token'),
    hashToken: jest.fn().mockReturnValue('hashed-token'),
    getTokenExpiration: jest.fn(),
}));
jest.unstable_mockModule('../middleware/auth.js', () => ({
    blacklistToken: jest.fn().mockResolvedValue(true),
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Import controller AFTER mocking
const authController = await import('../controllers/authController.js');

describe('AuthController Security Hardening', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Registration Atomicity (Zombie User Prevention)', () => {
        it('should use atomic createUserWithVerification instead of separate calls', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
                phone: '1234567890'
            };

            mockUserRepository.findUserByEmail.mockResolvedValue(null);
            mockUserRepository.createUserWithVerification.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                role: 'customer'
            });

            await authController.register(req, res, next);

            // VERIFICATION: Ensure atomic function is called
            expect(mockUserRepository.createUserWithVerification).toHaveBeenCalledTimes(1);
            // Ensure old non-atomic createUser is NOT called
            expect(mockUserRepository.createUser).not.toHaveBeenCalled();


            if (next.mock.calls.length > 0) {
                console.error('ERROR IN CONTROLLER:', next.mock.calls[0][0]);
            }
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Password Reset Enumeration Prevention', () => {
        it('should return 200 OK generic message when user does NOT exist', async () => {
            req.body = { email: 'nonexistent@example.com' };
            mockUserRepository.findUserByEmail.mockResolvedValue(null);

            await authController.requestPasswordReset(req, res, next);

            // VERIFICATION: Should not leak that user is missing
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.stringContaining('If an account exists')
            }));
            // Should NOT send email
            expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should return 200 OK generic message when user DOES exist', async () => {
            req.body = { email: 'existing@example.com' };
            mockUserRepository.findUserByEmail.mockResolvedValue({
                id: 1,
                email: 'existing@example.com',
                isActive: true
            });

            await authController.requestPasswordReset(req, res, next);

            // VERIFICATION: Should return SAME message as above
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.stringContaining('If an account exists')
            }));
            // Should send email
            expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
        });
    });
});
