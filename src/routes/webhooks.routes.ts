import express, { Request, Response } from 'express';
import webhooksService from '../services/webhooks.service';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_SIGNATURE', message: 'Stripe signature header is required' }});
  }
  const result = await webhooksService.handleStripeWebhook(signature as string, req.body);
  res.json({ success: true, data: result });
}));

export default router;
