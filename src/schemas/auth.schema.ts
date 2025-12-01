import { z } from 'zod';

const validCountries = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT'] as const;

export const registerSchema = z.object({
  body: z.object({
    business_email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    business_name: z.string().min(2, 'Business name is required'),
    business_type: z.string().optional(),
    country: z.enum(validCountries).optional().default('US'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    business_email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});
