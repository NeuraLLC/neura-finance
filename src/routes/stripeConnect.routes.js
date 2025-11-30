const express = require('express');
const router = express.Router();
const stripeConnectService = require('../services/stripeConnect.service').default;
const { authenticateJWT, authenticateAPIKey } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/onboard', authenticateJWT, asyncHandler(async (req, res) => {
  const { merchant_id } = req.body;
  if (req.merchant.id !== merchant_id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only onboard your own account' }});
  }
  const url = stripeConnectService.generateConnectUrl(merchant_id);
  res.json({ success: true, data: { url, message: 'Redirect user to this URL to complete Stripe Connect onboarding' }});
}));

router.post('/start', authenticateAPIKey, asyncHandler(async (req, res) => {
  const merchantsService = require('../services/merchants.service').default;
  const merchant = await merchantsService.getMerchantByApiKey(req.apiKey);
  const url = stripeConnectService.generateConnectUrl(merchant.id);
  res.json({ success: true, data: { url, message: 'Redirect user to this URL to complete Stripe Connect onboarding' }});
}));

router.get('/callback', asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

  if (error) {
    return res.redirect(frontendUrl + '/dashboard/settings?stripe_error=' + error);
  }
  if (!code || !state) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required parameters' }});
  }
  const merchantId = state;
  const result = await stripeConnectService.handleCallback(code, merchantId);
  res.redirect(frontendUrl + '/dashboard?stripe_connected=true');
}));

router.get('/status', authenticateJWT, asyncHandler(async (req, res) => {
  const merchantId = req.merchant.id;
  const status = await stripeConnectService.getAccountStatus(merchantId);
  res.json({ success: true, data: status });
}));

router.post('/account-link', authenticateJWT, asyncHandler(async (req, res) => {
  const merchantId = req.merchant.id;
  const { type = 'account_onboarding' } = req.body;
  const link = await stripeConnectService.createAccountLink(merchantId, type);
  res.json({ success: true, data: link });
}));

router.delete('/disconnect', authenticateJWT, asyncHandler(async (req, res) => {
  const merchantId = req.merchant.id;
  const result = await stripeConnectService.disconnectAccount(merchantId);
  res.json({ success: true, data: result });
}));

router.get('/dashboard-link', authenticateJWT, asyncHandler(async (req, res) => {
  const merchantId = req.merchant.id;
  const link = await stripeConnectService.getDashboardLink(merchantId);
  res.json({ success: true, data: link });
}));

module.exports = router;
