const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service').default;
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/signup', asyncHandler(async (req, res) => {
  const { business_name, business_email, password, business_type } = req.body;
  if (!business_name || !business_email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'business_name, business_email, and password are required' }
    });
  }
  const result = await authService.signup(business_name, business_email, password, business_type);
  res.status(201).json({ success: true, data: result });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { business_email, password } = req.body;
  if (!business_email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'business_email and password are required' }
    });
  }
  const result = await authService.login(business_email, password);
  res.json({ success: true, data: result });
}));

router.post('/oauth/callback', asyncHandler(async (req, res) => {
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

router.get('/me', authenticateJWT, asyncHandler(async (req, res) => {
  const merchant = await authService.getCurrentMerchant(req.merchant.id);
  res.json({ success: true, data: { merchant } });
}));

module.exports = router;
