import express, { Request, Response } from 'express';
import paymentsService from '../services/payments.service';
import { authenticateAPIKey } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { createPaymentSchema, listPaymentsSchema, refundPaymentSchema } from '../schemas/payment.schema';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

router.post('/', authenticateAPIKey, validate(createPaymentSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { amount, currency, description, customer_email, customer_name, payment_method, metadata } = req.body;
  const idempotencyKey = req.headers['idempotency-key'] as string;
  const result = await paymentsService.createPayment(req.apiKey!, {
    amount, currency, description, customer_email, customer_name, payment_method, idempotency_key: idempotencyKey, metadata
  });
  res.status(201).json({ success: true, data: result });
}));

router.get('/:id', authenticateAPIKey, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const transaction = await paymentsService.getPayment(req.apiKey!, id);
  res.json({ success: true, data: { transaction } });
}));

router.get('/', authenticateAPIKey, validate(listPaymentsSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit, offset, status, start_date, end_date } = req.query;
  const transactions = await paymentsService.listPayments(req.apiKey!, {
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
    status: status as string,
    start_date: start_date as string,
    end_date: end_date as string
  });
  res.json({ success: true, data: { transactions, count: transactions.length } });
}));

router.post('/:id/refund', authenticateAPIKey, validate(refundPaymentSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const result = await paymentsService.refundPayment(req.apiKey!, id, {
    amount, reason
  });
  res.json({ success: true, data: result });
}));

router.post('/:id/cancel', authenticateAPIKey, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const result = await paymentsService.cancelPayment(req.apiKey!, id);
  res.json({ success: true, data: result });
}));

export default router;
