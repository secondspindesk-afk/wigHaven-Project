import dotenv from 'dotenv';
import createApp from './server.js';
import { initializePrisma, disconnectPrisma } from './config/database.js';
import { initializeQueue } from './config/queue.js';
import { startWorker } from './workers/webhookWorker.js';
import { startCronJobs } from './jobs/cronJobs.js';
import { startEmailWorker } from './jobs/emailWorker.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

import validateEnv from './config/env.js';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const PORT = parseInt(process.env.PORT || '5000', 10);
let server = null;

/**
 * Start the server with all connections
 */
const startServer = async () => {
    try {
        logger.info('='.repeat(60));
        logger.info('🚀 Starting WigHaven Backend Server...');
        logger.info('='.repeat(60));

        // Initialize database connection
        logger.info('📊 Connecting to PostgreSQL...');
        await initializePrisma();

        // Initialize Queue System FIRST (required by workers)
        logger.info('🔧 Initializing Queue System...');
        await initializeQueue();

        // Start Background Services (queue is now ready)
        logger.info('👷 Starting Webhook Worker...');
        await startWorker(); // AWAIT to ensure subscribed before server starts

        logger.info('⏰ Starting Cron Jobs...');
        startCronJobs();

        logger.info('📧 Starting Email Worker...');
        await startEmailWorker(); // AWAIT to ensure ready

        // Initialize business milestones
        logger.info('🎯 Initializing Business Milestones...');
        const milestoneService = (await import('./services/milestoneService.js')).default;
        await milestoneService.initializeMilestones();
        logger.info('✓ Milestones initialized');

        // Fetch initial currency rates
        logger.info('💱 Fetching Initial Currency Rates...');
        const currencyService = (await import('./services/currencyService.js')).default;
        try {
            await currencyService.updateRatesInDb();
            logger.info('✓ Currency rates initialized');
        } catch (error) {
            logger.warn('⚠ Failed to fetch initial currency rates (will retry in next cron cycle)');
        }

        // Create Express app
        const app = createApp();

        // Start HTTP server
        server = app.listen(PORT, async () => {
            const address = server.address();
            const host = address.address === '::' ? 'localhost' : address.address;
            const port = address.port;

            // Initialize WebSocket Server
            const { initializeWebSocket } = await import('./config/websocket.js');
            initializeWebSocket(server);

            logger.info('='.repeat(60));
            logger.info(`✅ Server successfully started!`);
            logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 Local: http://localhost:${port}`);
            if (host !== 'localhost') {
                logger.info(`🔗 Network: http://${host}:${port}`);
            }
            logger.info(`🏥 Health check: http://localhost:${port}/api/health`);
            logger.info('='.repeat(60));
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use. Please use a different port.`);
            } else {
                logger.error('Server error:', error);
            }
            process.exit(1);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        logger.error('Exiting due to startup failure...');
        process.exit(1);
    }
};

/**
 * Gracefully shutdown the server
 */
const gracefulShutdown = async (signal) => {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🛑 ${signal} received. Starting graceful shutdown...`);
    logger.info('='.repeat(60));

    // Set timeout for forced shutdown
    const shutdownTimeout = setTimeout(() => {
        logger.error('❌ Forced shutdown after 30 seconds timeout');
        process.exit(1);
    }, 30000);

    try {
        // Close HTTP server
        if (server) {
            logger.info('🔌 Closing HTTP server...');
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            logger.info('✓ HTTP server closed');
        }

        // Disconnect from database
        logger.info('📊 Disconnecting from PostgreSQL...');
        await disconnectPrisma();

        clearTimeout(shutdownTimeout);
        logger.info('='.repeat(60));
        logger.info('✅ Graceful shutdown completed successfully');
        logger.info('='.repeat(60));
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
