import { z } from 'zod';

// Password validation rules matching backend
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#)');

// Email validation
const emailSchema = z.string()
    .email('Please provide a valid email address')
    .max(255, 'Email must not exceed 255 characters');

// Name validation
const nameSchema = z.string()
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens');

// Phone validation (E.164 format)
const phoneSchema = z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal(''));

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
