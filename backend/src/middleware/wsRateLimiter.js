import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for WebSocket connection attempts
 * Prevents DoS attacks by limiting connection attempts per IP
 * 
 * Limits:
 * - 10 connection attempts per minute per IP
 * - Sliding window to prevent burst attacks
 */
export const wsConnectionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 10, // 10 connection attempts per window
    message: 'Too many WebSocket connection attempts. Please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Skip OPTIONS requests (preflight)
    skip: (req) => req.method === 'OPTIONS',
    // Custom key generator (use IP address + user agent for better granularity)
    keyGenerator: (req) => {
        return req.ip || req.socket.remoteAddress || 'unknown';
    },
    // Handler called when rate limit is exceeded
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many WebSocket connection attempts',
            retryAfter: Math.ceil(60), // seconds
        });
    },
});

/**
 * Stricter rate limiter for production environments
 * More conservative limits for public-facing APIs
 */
export const wsConnectionLimiterStrict = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minute window
    max: 20, // 20 connection attempts per 5 minutes
    message: 'Connection rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});
