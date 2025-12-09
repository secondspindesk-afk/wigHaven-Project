import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        const baseMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        return stack ? `${baseMessage}\n${stack}` : baseMessage;
    })
);

// Console format with colors
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        const baseMessage = `${timestamp} ${level}: ${message}`;
        return stack ? `${baseMessage}\n${stack}` : baseMessage;
    })
);

// Create Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Write all logs to app.log
        new winston.transports.File({
            filename: join(logsDir, 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write errors to error.log
        new winston.transports.File({
            filename: join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
}

// Helper methods for structured logging
logger.logRequest = (method, url, statusCode, responseTime) => {
    const message = `${method} ${url} - ${statusCode} - ${responseTime}ms`;

    if (statusCode >= 500) {
        logger.error(message);
    } else if (statusCode >= 400) {
        logger.warn(message);
    } else {
        logger.info(message);
    }
};

logger.logError = (error, context = {}) => {
    const errorMessage = {
        message: error.message,
        stack: error.stack,
        ...context,
    };

    logger.error(JSON.stringify(errorMessage, null, 2));
};

export default logger;
