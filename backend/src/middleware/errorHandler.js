import logger from '../utils/logger.js';

/**
 * Global error handling middleware
 * Catches all errors and returns consistent JSON responses
 * Never exposes sensitive data or stack traces in production
 */
const errorHandler = (err, req, res, next) => {
    // Sanitize body - NEVER log passwords or sensitive data
    const sanitizeBody = (body) => {
        if (!body || typeof body !== 'object') return body;
        const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'accessToken', 'refreshToken', 'creditCard', 'cvv', 'cardNumber'];
        const sanitized = { ...body };
        sensitiveFields.forEach(field => {
            if (sanitized[field]) sanitized[field] = '[REDACTED]';
        });
        return sanitized;
    };

    // Log the error with sanitized details
    // Skip verbose logging for expected auth errors (401/403)
    const isExpectedAuthError = err.statusCode === 401 || err.statusCode === 403 ||
        err.name === 'UnauthorizedError' || err.name === 'ForbiddenError';

    if (isExpectedAuthError) {
        // Simple warning log for auth errors - no stack trace
        logger.warn(`${req.method} ${req.originalUrl} - ${err.statusCode || 401} - ${err.message}`);
    } else {
        logger.logError(err, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            // Only log body in development, and always sanitized
            body: process.env.NODE_ENV === 'development' ? sanitizeBody(req.body) : undefined,
        });
    }

    // Default error status and message
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let errorType = err.name || 'Error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message || 'Validation failed';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid or expired token';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        // Keep the original message (e.g., "Invalid email or password")
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Access forbidden';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Resource not found';
    } else if (err.name === 'ConflictError') {
        statusCode = 409;
        message = 'Resource already exists';
    } else if (err.name === 'TooManyRequestsError') {
        statusCode = 429;
        message = err.message || 'Too many requests';
    } else if (err.name === 'ServiceUnavailableError') {
        statusCode = 503;
        message = err.message || 'Service unavailable';
    } else if (err.code === 'P2002') {
        // Prisma unique constraint violation
        statusCode = 409;
        message = 'Resource already exists';
        errorType = 'ConflictError';
    } else if (err.code === 'P2025') {
        // Prisma record not found
        statusCode = 404;
        message = 'Resource not found';
        errorType = 'NotFoundError';
    } else if (err.code && err.code.startsWith('P')) {
        // Other Prisma errors
        statusCode = 500;
        message = 'Database operation failed';
        errorType = 'DatabaseError';
    }

    // Build error response
    const errorResponse = {
        success: false,
        error: {
            type: errorType,
            message: message,
        },
    };

    // Include validation details in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.details = err.details || null;
        errorResponse.error.stack = err.stack || null;
    }

    // Add specific field errors for validation failures
    if (err.isJoi || err.name === 'ValidationError') {
        errorResponse.error.fields = err.details
            ? err.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }))
            : null;
    }

    // Never expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        errorResponse.error.message = 'An unexpected error occurred';
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Catches all requests to undefined routes
 */
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.name = 'NotFoundError';
    next(error);
};

/**
 * Async handler wrapper
 * Automatically catches errors in async route handlers
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.details = details;
    }
}

export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized access') {
        super(message);
        this.name = 'UnauthorizedError';
        this.statusCode = 401;
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'Access forbidden') {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
    }
}

export class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

export class ConflictError extends Error {
    constructor(message = 'Resource already exists') {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
    }
}

export class TooManyRequestsError extends Error {
    constructor(message = 'Too many requests') {
        super(message);
        this.name = 'TooManyRequestsError';
        this.statusCode = 429;
    }
}

export class ServiceUnavailableError extends Error {
    constructor(message = 'Service unavailable') {
        super(message);
        this.name = 'ServiceUnavailableError';
        this.statusCode = 503;
    }
}

export default errorHandler;
