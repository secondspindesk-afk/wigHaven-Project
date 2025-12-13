import Joi from 'joi';
import logger from './logger.js';

/**
 * Validation schemas for authentication and product endpoints
 * Uses Joi for comprehensive input validation
 */

// Password validation rules
const passwordSchema = Joi.string()
    .min(8)
    .max(72) // Anti-DoS & Bcrypt Limit: Prevent long strings blocking local event loop and silent truncation
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base':
            'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#)',
        'any.required': 'Password is required',
    });

// Email validation
const emailSchema = Joi.string().email().max(255).required().messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email must not exceed 255 characters',
    'any.required': 'Email is required',
});

// Name validation (for first/last name)
const nameSchema = Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s-]+$/)
    .required()
    .messages({
        'string.min': 'Name must be at least 1 character',
        'string.max': 'Name must not exceed 100 characters',
        'string.pattern.base': 'Name can only contain letters, spaces, and hyphens',
        'any.required': 'This field is required',
    });

// Phone validation (E.164 format, optional)
const phoneSchema = Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow(null, '')
    .messages({
        'string.pattern.base': 'Phone must be in E.164 format (e.g., +1234567890)',
    });

// AUTH SCHEMAS

export const registerSchema = Joi.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema.label('First name'),
    lastName: nameSchema.label('Last name'),
    phone: phoneSchema,
});

export const loginSchema = Joi.object({
    email: emailSchema,
    password: Joi.string().required().messages({
        'any.required': 'Password is required',
    }),
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Refresh token is required',
    }),
});

export const passwordResetRequestSchema = Joi.object({
    email: emailSchema,
});

export const passwordResetConfirmSchema = Joi.object({
    token: Joi.string().required().messages({
        'any.required': 'Reset token is required',
    }),
    newPassword: passwordSchema.label('New password'),
});


export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required',
    }),
    newPassword: passwordSchema.label('New password'),
});

export const emailVerificationSchema = Joi.object({
    token: Joi.string().required().messages({
        'any.required': 'Verification token is required',
    }),
});

// PRODUCT SCHEMAS

export const createProductSchema = Joi.object({
    name: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Product name must be at least 1 character',
        'string.max': 'Product name must not exceed 255 characters',
        'any.required': 'Product name is required',
    }),
    description: Joi.string().min(3).required().messages({
        'string.min': 'Product description must be at least 3 characters',
        'any.required': 'Product description is required',
    }),
    // Accept both snake_case and camelCase
    basePrice: Joi.number().min(0.01).messages({
        'number.min': 'Base price must be at least 0.01',
    }),
    base_price: Joi.number().min(0.01).messages({
        'number.min': 'Base price must be at least 0.01',
    }),
    category: Joi.string().messages({}),
    category_id: Joi.string().messages({}),
    categoryId: Joi.string().messages({}),
    is_active: Joi.boolean().default(true),
    isActive: Joi.boolean().default(true),
    is_featured: Joi.boolean().default(false),
    isFeatured: Joi.boolean().default(false),
    images: Joi.array().items(Joi.string()).max(10).default([]).messages({
        'array.max': 'Maximum 10 images allowed',
    }),
    variants: Joi.array().items(Joi.object({
        sku: Joi.string().allow(''),
        price: Joi.number().min(0),
        stock: Joi.number().min(0),
        color: Joi.string().allow(''),
        length: Joi.string().allow(''),
        texture: Joi.string().allow(''),
        size: Joi.string().allow(''),
        images: Joi.array().items(Joi.string()),
        is_active: Joi.boolean(),
        isActive: Joi.boolean(),
    })).default([]),
}).or('basePrice', 'base_price') // At least one price field required
    .or('category', 'category_id', 'categoryId'); // At least one category field required

export const updateProductSchema = Joi.object({
    name: Joi.string().min(1).max(255),
    description: Joi.string().min(10),
    basePrice: Joi.number().min(0.01),
    base_price: Joi.number().min(0.01), // snake_case support
    category: Joi.string(),
    categoryId: Joi.string(),
    category_id: Joi.string(), // snake_case support
    images: Joi.array().items(Joi.string().uri()).max(10),
    isActive: Joi.boolean(),
    is_active: Joi.boolean(), // snake_case support
    isFeatured: Joi.boolean(),
    is_featured: Joi.boolean(), // snake_case support
    variants: Joi.array(), // Allow nested variant updates
}).min(0).unknown(true); // Changed from .min(1) to .min(0) for single-field updates

export const createVariantSchema = Joi.object({
    productId: Joi.string().required().messages({
        'any.required': 'Product ID is required',
    }),
    sku: Joi.string().min(1).max(100).required().messages({
        'string.min': 'SKU must be at least 1 character',
        'string.max': 'SKU must not exceed 100 characters',
        'any.required': 'SKU is required',
    }),
    price: Joi.number().min(0.01).required().messages({
        'number.min': 'Price must be at least 0.01',
        'any.required': 'Price is required',
    }),
    stock: Joi.number().integer().min(0).required().messages({
        'number.min': 'Stock cannot be negative',
        'number.integer': 'Stock must be an integer',
        'any.required': 'Stock is required',
    }),
    length: Joi.string().max(50).allow(null, ''),
    color: Joi.string().max(50).allow(null, ''),
    texture: Joi.string().max(50).allow(null, ''),
    size: Joi.string().max(50).allow(null, ''),
    images: Joi.array().items(Joi.string().uri()).max(10).default([]),
});

export const updateVariantSchema = Joi.object({
    sku: Joi.string().min(1).max(100),
    price: Joi.number().min(0.01),
    stock: Joi.number().integer().min(0),
    length: Joi.string().max(50).allow(null, ''),
    color: Joi.string().max(50).allow(null, ''),
    texture: Joi.string().max(50).allow(null, ''),
    size: Joi.string().max(50).allow(null, ''),
    images: Joi.array().items(Joi.string().uri()).max(10),
    isActive: Joi.boolean(),
    is_active: Joi.boolean(), // snake_case support
}).min(0).unknown(true); // Changed from .min(1) to .min(0) for single-field updates

// VALIDATION HELPERS

export const validate = (schema, data) => {
    return schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });
};

export const validateRequest = (schema) => {
    return (req, res, next) => {
        logger.debug('🔍 Validating request body:', JSON.stringify(req.body, null, 2));

        const { error, value } = validate(schema, req.body);

        if (error) {
            const details = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            logger.warn(`❌ Validation failed for ${req.path}`);
            logger.warn(`Validation errors: ${JSON.stringify(details)}`);

            return res.status(400).json({
                success: false,
                error: {
                    type: 'ValidationError',
                    message: 'Validation failed',
                    fields: details,
                },
            });
        }

        logger.debug('✅ Validation passed');
        req.body = value;
        next();
    };
};

export default {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    passwordResetRequestSchema,
    passwordResetConfirmSchema,
    changePasswordSchema,
    emailVerificationSchema,
    createProductSchema,
    updateProductSchema,
    createVariantSchema,
    updateVariantSchema,
    validate,
    validateRequest,
};
