import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Advanced Rate Limiting with different tiers
 */
class AdvancedRateLimiting {
  /**
   * Global rate limiter - applies to all requests
   */
  public globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });

  /**
   * Strict rate limiter for authentication endpoints
   */
  public authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
      },
    },
    skipSuccessfulRequests: true, // Only count failed attempts
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * Payment endpoint rate limiter
   */
  public paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 payment requests per minute
    message: {
      success: false,
      error: {
        code: 'PAYMENT_RATE_LIMIT',
        message: 'Too many payment requests. Please wait before creating more payments.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * Webhook endpoint rate limiter (more permissive for external services)
   */
  public webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    message: {
      success: false,
      error: {
        code: 'WEBHOOK_RATE_LIMIT',
        message: 'Webhook rate limit exceeded.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * Dynamic rate limiter based on user tier
   */
  public dynamicLimiter = (req: Request, res: Response, next: NextFunction) => {
    // This would integrate with your merchant tier system
    // For now, using a basic implementation

    const apiKey = req.headers['x-api-key'] as string;
    const isTestMode = apiKey?.startsWith('npk_test_');

    // Different limits for test vs production
    const limits = {
      test: {
        windowMs: 60 * 1000,
        max: 20, // 20 requests per minute for test
      },
      production: {
        windowMs: 60 * 1000,
        max: 60, // 60 requests per minute for production
      },
    };

    const config = isTestMode ? limits.test : limits.production;

    const limiter = rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: {
        success: false,
        error: {
          code: 'DYNAMIC_RATE_LIMIT',
          message: `Rate limit exceeded for ${isTestMode ? 'test' : 'production'} mode.`,
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    return limiter(req, res, next);
  };

  /**
   * Sliding window rate limiter using Redis (for distributed systems)
   * This is a placeholder - would require Redis integration
   */
  public slidingWindowLimiter = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // TODO: Implement Redis-based sliding window
    // For now, just pass through
    next();
  };

  /**
   * Cost-based rate limiting (different endpoints cost different "points")
   */
  public costBasedLimiter = (costs: Map<string, number>) => {
    const pointsMap = new Map<string, { points: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || 'unknown';
      const endpoint = req.path;
      const cost = costs.get(endpoint) || 1;

      const MAX_POINTS = 100;
      const REFILL_RATE = 10; // points per second
      const now = Date.now();

      let tracker = pointsMap.get(ip);

      if (!tracker) {
        tracker = {
          points: MAX_POINTS - cost,
          resetTime: now,
        };
        pointsMap.set(ip, tracker);
        return next();
      }

      // Refill points based on time passed
      const timePassed = (now - tracker.resetTime) / 1000;
      const pointsToAdd = Math.floor(timePassed * REFILL_RATE);
      tracker.points = Math.min(MAX_POINTS, tracker.points + pointsToAdd);
      tracker.resetTime = now;

      // Check if enough points
      if (tracker.points < cost) {
        const waitTime = Math.ceil((cost - tracker.points) / REFILL_RATE);
        res.status(429).json({
          success: false,
          error: {
            code: 'COST_LIMIT_EXCEEDED',
            message: `Not enough request quota. Please wait ${waitTime} seconds.`,
          },
        });
        return;
      }

      // Deduct points
      tracker.points -= cost;
      next();
    };
  };

  /**
   * Get rate limit stats for monitoring
   */
  public getStats() {
    return {
      limiters: {
        global: {
          windowMs: 60000,
          max: 100,
        },
        auth: {
          windowMs: 900000,
          max: 5,
        },
        payment: {
          windowMs: 60000,
          max: 10,
        },
        webhook: {
          windowMs: 60000,
          max: 200,
        },
      },
    };
  }
}

// Export singleton instance
export const advancedRateLimiting = new AdvancedRateLimiting();
