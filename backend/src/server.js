import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import requestLogger from './middleware/requestLogger.js';
import checkBlockedIP from './middleware/ipBlocker.js';
import maintenanceMode from './middleware/maintenanceMode.js'; // Added
import errorHandler, { notFoundHandler } from './middleware/errorHandler.js';
import { getPrisma } from './config/database.js';
import logger from './utils/logger.js';
import authRoutes from './routes/authRoutes.js';
import { optionalAuth } from './middleware/auth.js'; // Added for maintenance mode user check
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import imagekitRoutes from './routes/imagekitRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import currencyRoutes from './routes/currencyRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import unsubscribeRoutes from './routes/unsubscribeRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import discountRoutes from './routes/discountRoutes.js'; // Added import
import { paystackWebhook } from './controllers/orderController.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Express application
 */
const createApp = () => {
    const app = express();

    // Security middleware - Helmet with custom configuration
    app.use(
        helmet({
            contentSecurityPolicy: process.env.NODE_ENV === 'production',
            crossOriginEmbedderPolicy: false, // Allow embedding for payment iframes (Paystack)
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true,
            },
        })
    );

    // GZIP Compression
    app.use(compression());

    // CORS configuration - Allow all origins in development
    app.use(
        cors({
            origin: (origin, callback) => {
                // Allow all origins in development
                if (process.env.NODE_ENV === 'development') {
                    // Log CORS requests in development for debugging
                    logger.debug(`CORS request from origin: ${origin || 'same-origin'}`);
                    callback(null, true);
                } else {
                    // In production, only allow specific frontend URL
                    const allowedOrigins = [
                        process.env.FRONTEND_URL,
                        'http://localhost:3000', // Fallback for local testing
                    ].filter(Boolean); // Remove undefined values

                    if (!origin || allowedOrigins.includes(origin)) {
                        callback(null, true);
                    } else {
                        logger.warn(`CORS blocked request from origin: ${origin}`);
                        callback(new Error('Not allowed by CORS'));
                    }
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Paystack-Signature'],
            exposedHeaders: ['X-Session-ID'],
        })
    );

    // Body parsing middleware
    // CRITICAL: Webhook needs raw body for signature verification
    // Must come BEFORE express.json() to capture raw buffer
    app.post('/webhook/paystack', express.raw({ type: 'application/json' }), paystackWebhook);

    // Standard JSON parsing for all other routes
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files (uploads) with CORS headers
    app.use('/uploads', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
    }, express.static(path.join(__dirname, '../public/uploads')));

    // Request logging
    app.use(requestLogger);

    // Blocked IP Check
    app.use(checkBlockedIP);

    // Optional Auth (Must be before maintenance mode to check for admin role)
    app.use(optionalAuth);

    // Maintenance Mode Check (Must be before rate limiter and routes)
    app.use(maintenanceMode);

    // General API rate limiter (applies to all routes except /api/health and super admins)
    app.use(generalLimiter);

    // Health check endpoint
    app.get('/api/health', async (req, res) => {
        try {
            // Check database connection
            let databaseStatus = 'disconnected';
            try {
                const prisma = getPrisma();
                await prisma.$queryRaw`SELECT 1`;
                databaseStatus = 'connected';
            } catch (error) {
                logger.error('Database health check failed:', error);
            }

            // Overall health status
            const isHealthy = databaseStatus === 'connected';

            // 200 = Healthy, 503 = Unhealthy
            let statusCode = 200;
            let overallStatus = 'healthy';

            if (!isHealthy) {
                statusCode = 503; // Service Unavailable
                overallStatus = 'unhealthy';
            }

            res.status(statusCode).json({
                success: true,
                status: overallStatus,
                timestamp: new Date().toISOString(),
                services: {
                    database: databaseStatus,
                },
                environment: process.env.NODE_ENV || 'development',
                version: '1.0.0',
                uptime: process.uptime(),
            });
        } catch (error) {
            logger.error('Health check error:', error);
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Health check failed',
            });
        }
    });

    // Root route handler - Required for Hugging Face Spaces platform health checks
    // HF sends GET / and GET /?logs=container&__sign=... for container monitoring
    app.get('/', (req, res) => {
        // If this is an HF internal request (logs/container check), return simple OK
        if (req.query.logs || req.query.__sign) {
            return res.status(200).json({
                status: 'ok',
                service: 'wighaven-backend',
                message: 'Container is running'
            });
        }

        // For regular root requests, return API info
        res.json({
            success: true,
            message: 'WigHaven Backend API',
            version: '1.0.0',
            health: '/api/health',
            docs: '/api'
        });
    });

    // API Routes
    app.get('/api', (req, res) => {
        res.json({
            success: true,
            message: 'WigHaven API - Phase 5 Complete ✅',
            version: '1.0.0',
            endpoints: {
                health: '/api/health',
                auth: '/api/auth/*',
                products: '/api/products/*',
                cart: '/api/cart/*',
                orders: '/api/orders/*',
                webhooks: '/api/webhooks/*',
                stock: '/api/admin/stock/*',
            },
        });
    });

    // Order Confirmation Page (Root Level)
    app.get('/order/confirmation', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Successful</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 50px; background: #f0f2f5; }
                    .card { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                    h1 { color: #2ecc71; margin-bottom: 10px; }
                    p { color: #555; font-size: 1.1em; }
                    .btn { display: inline-block; margin-top: 20px; padding: 12px 25px; background: #667eea; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; }
                    .btn:hover { background: #5a6fd6; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div style="font-size: 50px;">✅</div>
                    <h1>Payment Successful!</h1>
                    <p>Thank you for your order. Your payment has been processed successfully.</p>
                    <p>You can close this window and return to the order page.</p>
                    <a href="javascript:window.close()" class="btn">Close Window</a>
                </div>
            </body>
            </html>
        `);
    });

    // CRITICAL: Paystack webhook endpoint already configured above with raw body middleware
    // (Line 84 - configured BEFORE JSON parser for signature verification)

    // Mount routes
    // IMPORTANT: Specific routes MUST come before generic /api routes
    app.use('/api/unsubscribe', unsubscribeRoutes); // MOVED TO TOP
    app.use('/api/support', supportRoutes);
    app.use('/api/wishlist', wishlistRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/addresses', addressRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/admin/stock', stockRoutes);
    app.use('/api/admin/emails', emailRoutes);
    app.use('/api/admin/dashboard', dashboardRoutes);
    app.use('/api/admin/users', adminUserRoutes);
    app.use('/api/admin/settings', settingsRoutes);
    app.use('/api/settings', settingsRoutes); // Public access (specific routes like /public)
    app.use('/api/admin/discounts', discountRoutes); // Added admin discount routes
    app.use('/api/super-admin', superAdminRoutes);
    app.use('/api/super-admin/imagekit', imagekitRoutes);

    // Generic /api routes (MUST BE LAST to avoid conflicts)
    app.use('/api/discounts', discountRoutes); // Added public discount routes (for validation)
    app.use('/api', currencyRoutes);
    app.use('/api', productRoutes);
    app.use('/api', orderRoutes);
    app.use('/api', uploadRoutes);
    app.use('/api', mediaRoutes);
    app.use('/api', bannerRoutes);
    app.use('/api', categoryRoutes);

    // 404 handler for undefined routes
    app.use(notFoundHandler);

    // Global error handler (must be last)
    app.use(errorHandler);

    return app;
};

export default createApp;
