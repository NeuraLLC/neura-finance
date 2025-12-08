import express, { Request, Response } from 'express';
import merchantsService from '../services/merchants.service';
import paymentsService from '../services/payments.service';
import { authenticateJWT } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadLogo } from '../config/upload.config';

import { validate } from '../middleware/validate';
import { updateEnvironmentSchema, updateWebhookSchema, updateProfileSchema } from '../schemas/merchant.schema';
import { updateBrandingSchema } from '../schemas/branding.schema';

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

router.get('/:id/branding', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }
  const branding = await merchantsService.getBranding(id);
  res.json({ success: true, data: { branding } });
}));

router.patch('/:id/branding', authenticateJWT, validate(updateBrandingSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  const branding = await merchantsService.updateBranding(id, req.body);
  res.json({ success: true, data: { branding } });
}));

router.post('/:id/branding/upload-logo', authenticateJWT, uploadLogo.single('logo'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only upload logos for your own merchant account' }});
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' }});
  }

  // Generate public URL for the uploaded file
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  const logoUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

  // Update branding with new logo URL
  const branding = await merchantsService.updateBranding(id, { logo_url: logoUrl });

  res.json({
    success: true,
    data: {
      logo_url: logoUrl,
      branding
    }
  });
}));

// Payment Links routes for dashboard (JWT authenticated)
router.get('/:id/payment-links', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { limit } = req.query;

  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }

  const db = require('../services/database.service').default;

  // Get payment links by merchant ID (skip API key authentication)
  const client = db.getClient();
  const { data: paymentLinks, error } = await client
    .from('payment_links')
    .select('*')
    .eq('merchant_id', id)
    .order('created_at', { ascending: false })
    .range(0, (limit ? parseInt(limit as string) : 100) - 1);

  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  res.json({ success: true, data: paymentLinks || [] });
}));

export default router;
