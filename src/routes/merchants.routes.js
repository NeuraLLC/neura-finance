const express = require('express');
const router = express.Router();
const merchantsService = require('../services/merchants.service').default;
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/:id', authenticateJWT, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }
  const merchant = await merchantsService.getMerchantById(id);
  res.json({ success: true, data: { merchant } });
}));

router.patch('/:id/environment', authenticateJWT, asyncHandler(async (req, res) => {
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

router.patch('/:id/webhook', authenticateJWT, asyncHandler(async (req, res) => {
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

router.get('/:id/stats', authenticateJWT, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only access your own merchant data' }});
  }
  const stats = await merchantsService.getMerchantStats(id);
  res.json({ success: true, data: stats });
}));

router.patch('/:id', authenticateJWT, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.merchant.id !== id) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own merchant data' }});
  }
  const merchant = await merchantsService.updateMerchantProfile(id, req.body);
  res.json({ success: true, data: { merchant } });
}));

module.exports = router;
