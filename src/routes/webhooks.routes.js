const express = require('express');
const router = express.Router();
const webhooksService = require('../services/webhooks.service').default;
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_SIGNATURE', message: 'Stripe signature header is required' }});
  }
  const result = await webhooksService.handleStripeWebhook(signature, req.body);
  res.json({ success: true, data: result });
}));

module.exports = router;
