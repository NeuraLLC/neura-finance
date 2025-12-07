import crypto from 'crypto';

/**
 * Generate HMAC signature for request
 * @param secret - API secret key
 * @param payload - Request payload (stringified JSON)
 * @param timestamp - Unix timestamp in seconds
 */
export function generateSignature(
  secret: string,
  payload: string,
  timestamp: string
): string {
  const message = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

/**
 * Verify HMAC signature from request
 * @param signature - Signature from X-Signature header
 * @param secret - API secret key
 * @param payload - Request payload (stringified JSON)
 * @param timestamp - Timestamp from X-Timestamp header
 * @param toleranceSeconds - How many seconds to allow for clock drift (default: 300 = 5 minutes)
 */
export function verifySignature(
  signature: string,
  secret: string,
  payload: string,
  timestamp: string,
  toleranceSeconds: number = 300
): { valid: boolean; error?: string } {
  // Verify timestamp is recent (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp);

  if (isNaN(requestTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  const timeDiff = Math.abs(now - requestTime);
  if (timeDiff > toleranceSeconds) {
    return {
      valid: false,
      error: `Request timestamp too old or too far in future. Time difference: ${timeDiff}s`,
    };
  }

  // Generate expected signature
  const expectedSignature = generateSignature(secret, payload, timestamp);

  // Compare signatures (constant-time comparison to prevent timing attacks)
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  return valid
    ? { valid: true }
    : { valid: false, error: 'Signature mismatch' };
}

/**
 * Hash API secret for storage
 * @param secret - Plain API secret
 */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Verify plain secret against hashed secret
 * @param plainSecret - Plain API secret
 * @param hashedSecret - Hashed API secret from database
 */
export function verifyHashedSecret(
  plainSecret: string,
  hashedSecret: string
): boolean {
  const hash = hashSecret(plainSecret);
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hashedSecret)
  );
}
