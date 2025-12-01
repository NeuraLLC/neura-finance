import express, { Request, Response } from 'express';
import merchantsService from '../services/merchants.service';
import { authenticateJWT } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

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

router.patch('/:id/environment', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { environment } = req.body;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  if (!environment) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'environment is required' }});
  }
  const result = await merchantsService.switchEnvironment(id, environment);
  res.json({ success: true, data: result });
}));

router.patch('/:id/webhook', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { webhook_url } = req.body;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  if (!webhook_url) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'webhook_url is required' }});
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

router.patch('/:id', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  const merchant = await merchantsService.updateMerchantProfile(id, req.body);
  res.json({ success: true, data: { merchant } });
}));

export default router;
