import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs every HTTP request with method, URL, status code, and response time
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Capture original end function
    const originalEnd = res.end;

    // Override res.end to log after response is sent
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;

        // Log the request
        logger.logRequest(method, originalUrl, statusCode, responseTime);

        // Log request details in debug mode
        if (process.env.NODE_ENV === 'development') {
            logger.debug(`IP: ${ip} | User-Agent: ${req.get('user-agent') || 'Unknown'}`);
        }

        // Call original end function
        originalEnd.apply(res, args);
    };

    next();
};

export default requestLogger;
