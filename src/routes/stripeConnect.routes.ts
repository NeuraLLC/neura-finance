import express, { Request, Response } from 'express';
import stripeConnectService from '../services/stripeConnect.service';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import merchantsService from '../services/merchants.service';
import ledgerService from '../services/ledger.service';

const router = express.Router();

// Extend Request type to include merchant and apiKey
interface AuthenticatedRequest extends Request {
  merchant?: any;
  apiKey?: string;
}

router.post('/onboard', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { merchant_id } = req.body;
  if (req.merchant.id !== merchant_id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only onboard your own account' }});
  }
  const url = stripeConnectService.generateConnectUrl(merchant_id);
  res.json({ success: true, data: { url, message: 'Redirect user to this URL to complete Stripe Connect onboarding' }});
}));

router.post('/start', authenticateAPIKey, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.apiKey) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'API Key required' }});
  }
  const merchant = await merchantsService.getMerchantByApiKey(req.apiKey);
  const url = stripeConnectService.generateConnectUrl(merchant.id);
  res.json({ success: true, data: { url, message: 'Redirect user to this URL to complete Stripe Connect onboarding' }});
}));

router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

  if (error) {
    return res.redirect(frontendUrl + '/dashboard/settings?stripe_error=' + error);
  }
  if (!code || !state) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required parameters' }});
  }
  const merchantId = state as string;
  await stripeConnectService.handleCallback(code as string, merchantId);
  res.redirect(frontendUrl + '/dashboard?stripe_connected=true');
}));

router.get('/status', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const status = await stripeConnectService.getAccountStatus(merchantId);
  res.json({ success: true, data: status });
}));

router.post('/account-link', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const { type = 'account_onboarding' } = req.body;
  const link = await stripeConnectService.createAccountLink(merchantId, type);
  res.json({ success: true, data: link });
}));

router.delete('/disconnect', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const result = await stripeConnectService.disconnectAccount(merchantId);
  res.json({ success: true, data: result });
}));

router.get('/dashboard-link', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const link = await stripeConnectService.getDashboardLink(merchantId);
  res.json({ success: true, data: link });
}));

// Custom Account Routes (White-Label)
router.post('/custom/create', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const { email, country } = req.body;
  const accountId = await stripeConnectService.createCustomAccount(merchantId, email, country);
  res.json({ success: true, data: { accountId } });
}));

// Balance & Payout Routes
router.get('/balance', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const balance = await ledgerService.getBalance(merchantId);
  res.json({ success: true, data: balance });
}));

router.post('/payout', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const merchantId = req.merchant.id;
  const transferId = await stripeConnectService.transferFunds(merchantId);
  res.json({ success: true, data: { transferId, message: 'Payout initiated successfully' } });
}));

export default router;
