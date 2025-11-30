const express = require('express');
const router = express.Router();
const paymentsService = require('../services/payments.service').default;
const { authenticateAPIKey } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/', authenticateAPIKey, asyncHandler(async (req, res) => {
  const { amount, currency, description, customer_email, customer_name, payment_method, metadata } = req.body;
  if (!amount) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'amount is required' }});
  }
  const idempotencyKey = req.headers['idempotency-key'];
  const result = await paymentsService.createPayment(req.apiKey, {
    amount, currency, description, customer_email, customer_name, payment_method, idempotency_key: idempotencyKey, metadata
  });
  res.status(201).json({ success: true, data: result });
}));

router.get('/:id', authenticateAPIKey, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const transaction = await paymentsService.getPayment(req.apiKey, id);
  res.json({ success: true, data: { transaction } });
}));

router.get('/', authenticateAPIKey, asyncHandler(async (req, res) => {
  const { limit, offset, status, start_date, end_date } = req.query;
  const transactions = await paymentsService.listPayments(req.apiKey, {
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
    status, start_date, end_date
  });
  res.json({ success: true, data: { transactions, count: transactions.length } });
}));

router.post('/:id/refund', authenticateAPIKey, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const result = await paymentsService.refundPayment(req.apiKey, id, {
    amount: amount ? parseInt(amount) : undefined, reason
  });
  res.json({ success: true, data: result });
}));

router.post('/:id/cancel', authenticateAPIKey, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await paymentsService.cancelPayment(req.apiKey, id);
  res.json({ success: true, data: result });
}));

module.exports = router;
