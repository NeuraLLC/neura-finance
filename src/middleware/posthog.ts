import { Request, Response, NextFunction } from 'express';
import posthogService from '../services/posthog.service';

interface AuthenticatedRequest extends Request {
  merchant?: {
    id: string;
    email: string;
  };
  user?: {
    id: string;
    email: string;
  };
}

export const posthogMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Capture request start time
  const start = Date.now();

  // Wait for response to finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const distinctId = req.merchant?.id || req.user?.id || 'anonymous';

    // Track API Request
    posthogService.capture(distinctId, 'api_request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      user_agent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Identify user if authenticated
    if (req.merchant) {
      posthogService.identify(req.merchant.id, {
        email: req.merchant.email,
        type: 'merchant',
      });
    }
  });

  next();
};
