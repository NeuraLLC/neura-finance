import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { verifySignature } from '../utils/hmac';
import merchantsService from '../services/merchants.service';

/**
 * Extended Request interface with merchant and API key properties
 */
interface AuthRequest extends Request {
  merchant?: {
    id: string;
    email: string;
  };
  apiKey?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  merchantId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;

    // Attach merchant info to request
    (req as AuthRequest).merchant = {
      id: decoded.merchantId,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    next(error);
  }
};

/**
 * API Key Authentication Middleware with HMAC Signature Verification
 * Verifies API key and HMAC signature from request headers
 */
export const authenticateAPIKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    const signature = req.headers['x-signature'] as string | undefined;
    const timestamp = req.headers['x-timestamp'] as string | undefined;

    if (!apiKey) {
      throw new AppError('API key is required', 401, 'API_KEY_MISSING');
    }

    // Validate API key format
    if (!apiKey.startsWith('npk_live_') && !apiKey.startsWith('npk_test_')) {
      throw new AppError('Invalid API key format', 401, 'INVALID_API_KEY');
    }

    if (!signature) {
      throw new AppError('Request signature is required. Include X-Signature header.', 401, 'SIGNATURE_MISSING');
    }

    if (!timestamp) {
      throw new AppError('Request timestamp is required. Include X-Timestamp header.', 401, 'TIMESTAMP_MISSING');
    }

    // Get merchant by API key (validates key exists and merchant is active)
    const merchant = await merchantsService.getMerchantByApiKey(apiKey);

    // Get raw request body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify HMAC signature
    const verification = verifySignature(
      signature,
      merchant.api_secret, // This is the hashed secret from DB
      rawBody,
      timestamp,
      300 // 5 minute tolerance
    );

    if (!verification.valid) {
      throw new AppError(
        verification.error || 'Invalid request signature',
        401,
        'INVALID_SIGNATURE'
      );
    }

    // Store API key and merchant info in request
    (req as AuthRequest).apiKey = apiKey;
    (req as AuthRequest).environment = apiKey.startsWith('npk_test_') ? 'sandbox' : 'production';
    (req as AuthRequest).merchant = {
      id: merchant.id,
      email: merchant.business_email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional JWT Authentication
 * Attaches merchant info if token is valid, but doesn't fail if missing
 */
export const optionalJWT = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, but that's okay
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;

    (req as AuthRequest).merchant = {
      id: decoded.merchantId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    // Token invalid, but we continue anyway
    next();
  }
};
