import { z } from 'zod';

/**
 * Validation schema for updating merchant branding
 */
export const updateBrandingSchema = z.object({
  body: z.object({
    logo_url: z.string()
      .url('Logo URL must be a valid URL')
      .max(2048, 'Logo URL cannot exceed 2048 characters')
      .nullable()
      .optional(),

    primary_color: z.string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Primary color must be a valid hex color (e.g., #2563eb)')
      .optional(),

    merchant_display_name: z.string()
      .max(100, 'Merchant display name cannot exceed 100 characters')
      .nullable()
      .optional(),

    default_currency: z.string()
      .length(3, 'Currency must be a 3-letter ISO code')
      .toLowerCase()
      .optional(),

    payment_methods: z.array(z.enum(['card']))
      .min(1, 'At least one payment method must be enabled')
      .optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one branding field must be provided' }
  ),
});
