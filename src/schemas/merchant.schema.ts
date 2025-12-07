import { z } from 'zod';

export const updateEnvironmentSchema = z.object({
  body: z.object({
    environment: z.enum(['sandbox', 'production']),
  }),
});

export const updateWebhookSchema = z.object({
  body: z.object({
    webhook_url: z.string().url('Invalid webhook URL'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    business_name: z.string().min(2).optional(),
    business_email: z.string().email().optional(),
    business_type: z.string().optional(),
    // Add other profile fields as needed
  }),
});
