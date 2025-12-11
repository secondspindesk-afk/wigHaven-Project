import dotenv from 'dotenv';
import createApp from './server.js';
import { initializePrisma, disconnectPrisma } from './config/database.js';
import { startWorker } from './workers/webhookWorker.js';
import { startCronJobs } from './jobs/cronJobs.js';
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

        // NOTE: PgBoss queue REMOVED - using simple in-memory email queue instead
        // This eliminates database connection pool issues with Supabase

        // Start Background Services
        logger.info('👷 Enabling Webhook Processing...');
        await startWorker(); // Now just logs that webhooks are enabled

        logger.info('⏰ Starting Cron Jobs...');
        startCronJobs();

        logger.info('📧 Email queue ready (in-memory)');
        // Simple email queue starts automatically on first use

        // Initialize business services in parallel (faster startup)
        logger.info('🎯 Initializing Business Services...');
        const [milestoneService, currencyService] = await Promise.all([
            import('./services/milestoneService.js'),
            import('./services/currencyService.js')
        ]);

        // Run both initializations in parallel
        await Promise.allSettled([
            milestoneService.default.initializeMilestones(),
            currencyService.default.updateRatesInDb()
        ]);
        logger.info('✓ Business services initialized');

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

            // Warm the cache (pre-fetch common data for instant first requests)
            try {
                const smartCache = (await import('./utils/smartCache.js')).default;
                const { getAllSettings } = await import('./services/settingsService.js');
                const { getActiveBanners } = await import('./services/bannerService.js');
                const { getCategories, listProducts } = await import('./services/productService.js');

                await smartCache.warmCache({
                    getSettings: getAllSettings,
                    getBanners: getActiveBanners,
                    getCategories: getCategories,
                    getFeaturedProducts: () => listProducts({ featured: true, limit: 20 })
                });
            } catch (warmupError) {
                logger.warn('Cache warm-up failed (non-fatal):', warmupError.message);
            }

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
