import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * @route   GET /utils/client-ip
 * @desc    Get the client's IP address
 * @access  Public
 */
router.get('/client-ip', asyncHandler(async (req: Request, res: Response) => {
  // Try multiple sources to get the real IP (for proxies/load balancers)
  const ip = 
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.headers['x-real-ip']?.toString() ||
    req.socket.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  res.json({ 
    success: true, 
    data: { 
      ip: ip.replace('::ffff:', '') // Remove IPv6 prefix if present
    } 
  });
}));

export default router;
