import { jest } from '@jest/globals';

// Mock Logger
const mockLogger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
};

jest.unstable_mockModule('../utils/logger.js', () => ({
    default: mockLogger,
}));

// Mock other dependencies to avoid errors during import
jest.unstable_mockModule('../db/repositories/userRepository.js', () => ({}));
jest.unstable_mockModule('../services/emailService.js', () => ({}));
jest.unstable_mockModule('../services/analyticsService.js', () => ({
    default: {
        getSystemStats: jest.fn(),
    }
}));
jest.unstable_mockModule('../config/websocket.js', () => ({
    broadcastForceLogout: jest.fn(),
}));
jest.unstable_mockModule('../config/database.js', () => ({
    getPrisma: () => ({
        // Mock prisma methods if needed
    }),
}));

// Import controller
const superAdminController = await import('../controllers/superAdminController.js');

describe('SuperAdminController Security', () => {
    let req, res, next;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv }; // Reset env
        req = {
            user: { email: 'super@admin.com', role: 'super_admin' },
            ip: '127.0.0.1'
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('getEnvVars (Hardened Environment Access)', () => {
        it('should ONLY return whitelisted environment variables', async () => {
            // Setup sensitive env vars
            process.env.NODE_ENV = 'test';
            process.env.PORT = '3000';
            process.env.FRONTEND_URL = 'http://localhost:3000';
            process.env.JWT_SECRET = 'secret_that_should_not_be_leaked';
            process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

            await superAdminController.getEnvVars(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                env: expect.objectContaining({
                    NODE_ENV: 'test',
                    PORT: '3000',
                    FRONTEND_URL: 'http://localhost:3000'
                })
            }));

            // VERIFICATION: Check that secrets are NOT in the response
            const responseData = res.json.mock.calls[0][0].env;
            expect(responseData).not.toHaveProperty('JWT_SECRET');
            expect(responseData).not.toHaveProperty('DATABASE_URL');
        });

        it('should log an audit warning strictly', async () => {
            await superAdminController.getEnvVars(req, res, next);

            // VERIFICATION: Check audit log
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('[SUPER_ADMIN] Env vars accessed by super@admin.com')
            );
        });
    });
});
