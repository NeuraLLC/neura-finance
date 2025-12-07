import express, { Request, Response } from 'express';
import paymentLinksService from '../services/paymentLinks.service';
import { authenticateAPIKey } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  apiKey?: string;
}

/**
 * Create payment link
 */
router.post(
  '/',
  authenticateAPIKey,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paymentLink = await paymentLinksService.createPaymentLink(req.apiKey!, req.body);

    res.status(201).json({
      success: true,
      data: paymentLink,
    });
  })
);

/**
 * List payment links
 */
router.get(
  '/',
  authenticateAPIKey,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { limit, offset } = req.query;

    const paymentLinks = await paymentLinksService.listPaymentLinks(req.apiKey!, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: paymentLinks,
    });
  })
);

/**
 * Get payment link by ID
 */
router.get(
  '/:id',
  authenticateAPIKey,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const paymentLink = await paymentLinksService.getPaymentLink(req.apiKey!, id);

    res.json({
      success: true,
      data: paymentLink,
    });
  })
);

/**
 * Update payment link
 */
router.patch(
  '/:id',
  authenticateAPIKey,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const paymentLink = await paymentLinksService.updatePaymentLink(req.apiKey!, id, req.body);

    res.json({
      success: true,
      data: paymentLink,
    });
  })
);

/**
 * Deactivate payment link
 */
router.delete(
  '/:id',
  authenticateAPIKey,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await paymentLinksService.deactivatePaymentLink(req.apiKey!, id);

    res.json({
      success: true,
      message: 'Payment link deactivated',
    });
  })
);

export default router;
