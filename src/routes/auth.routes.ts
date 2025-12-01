import express, { Request, Response } from 'express';
import authService from '../services/auth.service';
import { authenticateJWT } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  merchant?: any;
}

router.post('/signup', validate(registerSchema), asyncHandler(async (req: Request, res: Response) => {
  const { business_name, business_email, password, business_type, country } = req.body;
  const result = await authService.signup(business_name, business_email, password, business_type, country || 'US');
  res.status(201).json({ success: true, data: result });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { business_email, password } = req.body;
  const result = await authService.login(business_email, password);
  res.json({ success: true, data: result });
}));

router.post('/oauth/callback', asyncHandler(async (req: Request, res: Response) => {
  const { provider, user } = req.body;
  if (!provider || !user || !user.id || !user.email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'provider, user.id, and user.email are required' }
    });
  }
  const result = await authService.handleOAuthCallback(
    provider, user.id, user.email, user.user_metadata?.full_name || user.user_metadata?.name
  );
  res.json({ success: true, data: result });
}));

router.get('/me', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchant = await authService.getCurrentMerchant(req.merchant.id);
  res.json({ success: true, data: { merchant } });
}));

export default router;
