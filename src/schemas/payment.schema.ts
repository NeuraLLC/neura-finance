import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be a positive number'),
    currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
    description: z.string().optional(),
    customer_email: z.string().email('Invalid customer email').optional(),
    customer_name: z.string().optional(),
    payment_method: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const listPaymentsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    status: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }),
});

export const refundPaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be a positive number').optional(),
    reason: z.string().optional(),
  }),
});
