import express, { Request, Response } from 'express';
import merchantsService from '../services/merchants.service';
import paymentsService from '../services/payments.service';
import { authenticateJWT } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

import { validate } from '../middleware/validate';
import { updateEnvironmentSchema, updateWebhookSchema, updateProfileSchema } from '../schemas/merchant.schema';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  merchant?: any;
}

router.get('/:id', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }
  const merchant = await merchantsService.getMerchantById(id);
  res.json({ success: true, data: { merchant } });
}));

router.get('/:id/credentials', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own credentials' }});
  }
  const credentials = await merchantsService.getApiCredentials(id);
  res.json({ success: true, data: credentials });
}));

router.patch('/:id/environment', authenticateJWT, validate(updateEnvironmentSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { environment } = req.body;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  const result = await merchantsService.switchEnvironment(id, environment);
  res.json({ success: true, data: result });
}));

router.patch('/:id/webhook', authenticateJWT, validate(updateWebhookSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { webhook_url } = req.body;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  const result = await merchantsService.updateWebhookUrl(id, webhook_url);
  res.json({ success: true, data: result });
}));

router.get('/:id/stats', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }
  const stats = await merchantsService.getMerchantStats(id);
  res.json({ success: true, data: stats });
}));

router.patch('/:id', authenticateJWT, validate(updateProfileSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  const merchant = await merchantsService.updateMerchantProfile(id, req.body);
  res.json({ success: true, data: { merchant } });
}));

router.get('/:id/payments', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { limit, offset, status, start_date, end_date } = req.query;

  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }

  const transactions = await paymentsService.listPaymentsByMerchantId(id, {
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
    status: status as string,
    start_date: start_date as string,
    end_date: end_date as string
  });
  
  res.json({ success: true, data: { transactions, count: transactions.length } });
}));

export default router;
