import { Request, Response, NextFunction } from 'express';

interface RequestTracker {
  count: number;
  firstRequest: number;
  lastRequest: number;
  suspicious: boolean;
  blockedUntil?: number;
}

interface BurstTracker {
  requests: number[];
  totalRequests: number;
}

/**
 * DDoS Protection Middleware
 * Tracks request patterns and blocks suspicious IPs
 */
class DDoSProtection {
  private requestTrackers: Map<string, RequestTracker> = new Map();
  private burstTrackers: Map<string, BurstTracker> = new Map();
  private blockedIPs: Set<string> = new Set();

  // Configuration
  private readonly MAX_REQUESTS_PER_MINUTE = 120;
  private readonly MAX_REQUESTS_PER_SECOND = 20;
  private readonly BURST_THRESHOLD = 50; // requests in 1 second
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly SUSPICIOUS_THRESHOLD = 3; // Number of violations before blocking
  private readonly CLEANUP_INTERVAL = 60 * 1000; // Clean up every minute

  constructor() {
    // Periodic cleanup of old entries
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Check if IP is blocked
   */
  private isBlocked(ip: string): boolean {
    const tracker = this.requestTrackers.get(ip);
    if (!tracker || !tracker.blockedUntil) return false;

    const now = Date.now();
    if (now < tracker.blockedUntil) {
      return true;
    }

    // Unblock if time has passed
    tracker.blockedUntil = undefined;
    tracker.suspicious = false;
    return false;
  }

  /**
   * Block an IP address
   */
  private blockIP(ip: string): void {
    const tracker = this.requestTrackers.get(ip);
    if (tracker) {
      tracker.blockedUntil = Date.now() + this.BLOCK_DURATION;
      tracker.suspicious = true;
    }
    this.blockedIPs.add(ip);

    console.warn(`=¨ Blocked IP ${ip} for ${this.BLOCK_DURATION / 1000 / 60} minutes due to suspicious activity`);
  }

  /**
   * Detect burst attacks (too many requests in a short time)
   */
  private detectBurst(ip: string): boolean {
    const now = Date.now();
    let burstTracker = this.burstTrackers.get(ip);

    if (!burstTracker) {
      burstTracker = { requests: [], totalRequests: 0 };
      this.burstTrackers.set(ip, burstTracker);
    }

    // Add current request
    burstTracker.requests.push(now);
    burstTracker.totalRequests++;

    // Remove requests older than 1 second
    burstTracker.requests = burstTracker.requests.filter(
      (time) => now - time < 1000
    );

    // Check if burst threshold exceeded
    if (burstTracker.requests.length > this.BURST_THRESHOLD) {
      console.warn(`¡ Burst attack detected from IP ${ip}: ${burstTracker.requests.length} requests in 1 second`);
      return true;
    }

    return false;
  }

  /**
   * Track request and detect anomalies
   */
  private trackRequest(ip: string): boolean {
    const now = Date.now();
    let tracker = this.requestTrackers.get(ip);

    if (!tracker) {
      tracker = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        suspicious: false,
      };
      this.requestTrackers.set(ip, tracker);
    }

    // Reset counter if more than a minute has passed
    if (now - tracker.firstRequest > 60000) {
      tracker.count = 0;
      tracker.firstRequest = now;
    }

    tracker.count++;
    tracker.lastRequest = now;

    // Check for rate limit violations
    const requestsPerMinute = tracker.count;
    const timeSinceFirst = now - tracker.firstRequest;
    const requestsPerSecond = timeSinceFirst > 0
      ? (tracker.count / (timeSinceFirst / 1000))
      : 0;

    // Detect violations
    if (requestsPerMinute > this.MAX_REQUESTS_PER_MINUTE) {
      console.warn(`   IP ${ip} exceeded rate limit: ${requestsPerMinute} requests/minute`);
      return false;
    }

    if (requestsPerSecond > this.MAX_REQUESTS_PER_SECOND) {
      console.warn(`   IP ${ip} exceeded rate limit: ${requestsPerSecond.toFixed(2)} requests/second`);
      return false;
    }

    return true;
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const CLEANUP_AGE = 5 * 60 * 1000; // 5 minutes

    // Clean request trackers
    for (const [ip, tracker] of this.requestTrackers.entries()) {
      if (now - tracker.lastRequest > CLEANUP_AGE) {
        this.requestTrackers.delete(ip);
      }
    }

    // Clean burst trackers
    for (const [ip, tracker] of this.burstTrackers.entries()) {
      if (tracker.requests.length === 0 || now - tracker.requests[tracker.requests.length - 1] > CLEANUP_AGE) {
        this.burstTrackers.delete(ip);
      }
    }

    // Clean blocked IPs
    for (const ip of this.blockedIPs) {
      const tracker = this.requestTrackers.get(ip);
      if (!tracker || !tracker.blockedUntil || now > tracker.blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }
  }

  /**
   * Middleware function
   */
  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = this.getClientIP(req);

    // Check if IP is blocked
    if (this.isBlocked(ip)) {
      const tracker = this.requestTrackers.get(ip);
      const remainingTime = tracker?.blockedUntil
        ? Math.ceil((tracker.blockedUntil - Date.now()) / 1000 / 60)
        : 0;

      res.status(429).json({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: `Your IP has been temporarily blocked due to suspicious activity. Please try again in ${remainingTime} minutes.`,
        },
      });
      return;
    }

    // Detect burst attacks
    if (this.detectBurst(ip)) {
      this.blockIP(ip);
      res.status(429).json({
        success: false,
        error: {
          code: 'BURST_DETECTED',
          message: 'Too many requests in a short time. Your IP has been temporarily blocked.',
        },
      });
      return;
    }

    // Track request
    const allowed = this.trackRequest(ip);
    if (!allowed) {
      // Increment suspicious counter
      const tracker = this.requestTrackers.get(ip);
      if (tracker) {
        tracker.suspicious = true;
        // Block after multiple violations
        const violationCount = tracker.count - this.MAX_REQUESTS_PER_MINUTE;
        if (violationCount > this.SUSPICIOUS_THRESHOLD) {
          this.blockIP(ip);
        }
      }

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.',
        },
      });
      return;
    }

    next();
  };

  /**
   * Get statistics for monitoring
   */
  public getStats() {
    return {
      trackedIPs: this.requestTrackers.size,
      blockedIPs: this.blockedIPs.size,
      burstTrackers: this.burstTrackers.size,
      configuration: {
        maxRequestsPerMinute: this.MAX_REQUESTS_PER_MINUTE,
        maxRequestsPerSecond: this.MAX_REQUESTS_PER_SECOND,
        burstThreshold: this.BURST_THRESHOLD,
        blockDuration: this.BLOCK_DURATION / 1000 / 60,
      },
    };
  }

  /**
   * Manually unblock an IP (for admin use)
   */
  public unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    const tracker = this.requestTrackers.get(ip);
    if (tracker) {
      tracker.blockedUntil = undefined;
      tracker.suspicious = false;
    }
    console.log(` Manually unblocked IP ${ip}`);
  }
}

// Export singleton instance
export const ddosProtection = new DDoSProtection();
export const ddosMiddleware = ddosProtection.middleware;
