import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7860;
const TARGET_URL = process.env.PRIVATE_BACKEND_URL;
const HF_TOKEN = process.env.HF_TOKEN;

if (!TARGET_URL) {
    console.error('❌ FATAL: PRIVATE_BACKEND_URL is not set!');
    process.exit(1);
}

if (!HF_TOKEN) {
    console.warn('⚠️ WARNING: HF_TOKEN is not set! Private space access might fail.');
}

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for gateway as it might interfere with proxied content
    crossOriginEmbedderPolicy: false
}));

// Compression Middleware
app.use(compression());

// Logging Middleware
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs (Higher limit for gateway)
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Health check for the Gateway itself
app.get('/gateway-health', (req, res) => {
    res.json({ status: 'ok', service: 'wighaven-gateway' });
});

// Handle Hugging Face internal requests (logs, container checks)
// These requests come with ?logs=container&__sign=... and should not be proxied
app.get('/', (req, res, next) => {
    // If this is an HF internal request, handle it directly
    if (req.query.logs || req.query.__sign) {
        return res.status(200).json({
            status: 'ok',
            service: 'wighaven-gateway',
            message: 'Gateway is running'
        });
    }
    // Otherwise, let the proxy handle it
    next();
});

// Proxy Middleware Configuration
const proxyOptions = {
    target: TARGET_URL,
    changeOrigin: true, // Needed for virtual hosted sites
    ws: true, // Support WebSockets
    pathRewrite: {
        // Keep paths as is
    },
    onProxyReq: (proxyReq, req, res) => {
        // Inject the Hugging Face Token for authentication
        if (HF_TOKEN) {
            proxyReq.setHeader('Authorization', `Bearer ${HF_TOKEN}`);
        }
        // Forward the original host? Usually better to let changeOrigin handle it to avoid SSL mismatch
        // proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(502).json({ error: 'Bad Gateway', message: 'Failed to connect to private backend.' });
    },
    // Performance tuning
    timeout: 30000,
    proxyTimeout: 30000,
};

// Apply proxy to all routes
app.use('/', createProxyMiddleware(proxyOptions));

app.listen(PORT, () => {
    console.log(`🚀 Gateway running on port ${PORT}`);
    console.log(`🔗 Forwarding to: ${TARGET_URL}`);
});
