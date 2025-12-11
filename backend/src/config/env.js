import Joi from 'joi';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Variable Schema
 * Defines all required and optional environment variables with validation rules
 */
const envSchema = Joi.object({
    // Server
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(5000),
    FRONTEND_URL: Joi.string().uri().required(),

    // Database
    DATABASE_URL: Joi.string().required(),

    // Security
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('1h'),

    // Payments (Paystack)
    PAYSTACK_SECRET_KEY: Joi.string().required(),
    PAYSTACK_PUBLIC_KEY: Joi.string().required(),

    // Email (Resend API - replaces SMTP)
    RESEND_API_KEY: Joi.string().required(),
    EMAIL_FROM: Joi.string().optional(), // Optional - defaults to onboarding@resend.dev

    // ImageKit Cloud Storage
    IMAGEKIT_PUBLIC_KEY: Joi.string().required(),
    IMAGEKIT_PRIVATE_KEY: Joi.string().required(),
    IMAGEKIT_URL_ENDPOINT: Joi.string().uri().required(),

    // Super Admin (Optional but recommended)
    SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
    SUPER_ADMIN_SECRET: Joi.string().optional(),
    SUPER_ADMIN_WHITELIST: Joi.string().optional(),

    // Rate Limiting
    RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
}).unknown(); // Allow other variables

/**
 * Validate environment variables
 * Throws error if validation fails
 */
export const validateEnv = () => {
    const { error, value } = envSchema.validate(process.env, { abortEarly: false });

    if (error) {
        const missingVars = error.details.map((detail) => detail.message).join('\n- ');
        logger.error(`❌ Invalid Environment Variables:\n- ${missingVars}`);
        throw new Error('Environment variable validation failed');
    }

    logger.info('✓ Environment variables validated');
    return value;
};

export default validateEnv;
