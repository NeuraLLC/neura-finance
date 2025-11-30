import { Request, Response, NextFunction } from 'express';

interface BurstWindow {
  requests: number[];
  patterns: Map<string, number>; // Track request patterns
  lastReset: number;
}

interface AnomalyScore {
  score: number;
  factors: string[];
  timestamp: number;
}

/**
 * Advanced Burst Detection Middleware
 * Detects abnormal request patterns beyond simple rate limiting
 */
class BurstDetection {
  private burstWindows: Map<string, BurstWindow> = new Map();
  private anomalyScores: Map<string, AnomalyScore> = new Map();
  private whitelistedIPs: Set<string> = new Set();

  // Configuration
  private readonly WINDOW_SIZE = 10000; // 10 seconds
  private readonly MICRO_BURST_THRESHOLD = 30; // requests in 1 second
  private readonly SUSTAINED_BURST_THRESHOLD = 100; // requests in 10 seconds
  private readonly PATTERN_THRESHOLD = 0.8; // 80% similar requests
  private readonly ANOMALY_BLOCK_SCORE = 100;
  private readonly CLEANUP_INTERVAL = 30 * 1000; // 30 seconds

  constructor() {
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Get client IP
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Generate request signature for pattern detection
   */
  private getRequestSignature(req: Request): string {
    return `${req.method}:${req.path}:${req.headers['user-agent'] || 'unknown'}`;
  }

  /**
   * Detect micro-burst (extremely rapid requests)
   */
  private detectMicroBurst(ip: string, now: number): boolean {
    const window = this.burstWindows.get(ip);
    if (!window) return false;

    // Count requests in last 1 second
    const recentRequests = window.requests.filter((time) => now - time < 1000);

    if (recentRequests.length > this.MICRO_BURST_THRESHOLD) {
      console.warn(`¡ Micro-burst detected from ${ip}: ${recentRequests.length} requests in 1 second`);
      this.addAnomalyScore(ip, 50, 'micro_burst');
      return true;
    }

    return false;
  }

  /**
   * Detect sustained burst (high request rate over time)
   */
  private detectSustainedBurst(ip: string, now: number): boolean {
    const window = this.burstWindows.get(ip);
    if (!window) return false;

    // Count requests in window
    if (window.requests.length > this.SUSTAINED_BURST_THRESHOLD) {
      console.warn(`=% Sustained burst detected from ${ip}: ${window.requests.length} requests in ${this.WINDOW_SIZE / 1000}s`);
      this.addAnomalyScore(ip, 30, 'sustained_burst');
      return true;
    }

    return false;
  }

  /**
   * Detect repeated patterns (bot-like behavior)
   */
  private detectPattern(ip: string, signature: string): boolean {
    const window = this.burstWindows.get(ip);
    if (!window) return false;

    // Track pattern
    const count = window.patterns.get(signature) || 0;
    window.patterns.set(signature, count + 1);

    // Calculate pattern ratio
    const totalRequests = window.requests.length;
    const patternCount = count + 1;
    const ratio = totalRequests > 0 ? patternCount / totalRequests : 0;

    // Detect if pattern is too repetitive
    if (ratio > this.PATTERN_THRESHOLD && totalRequests > 10) {
      console.warn(`> Repetitive pattern detected from ${ip}: ${(ratio * 100).toFixed(1)}% identical requests`);
      this.addAnomalyScore(ip, 25, 'repetitive_pattern');
      return true;
    }

    return false;
  }

  /**
   * Add anomaly score
   */
  private addAnomalyScore(ip: string, points: number, factor: string): void {
    const existing = this.anomalyScores.get(ip) || {
      score: 0,
      factors: [],
      timestamp: Date.now(),
    };

    existing.score += points;
    if (!existing.factors.includes(factor)) {
      existing.factors.push(factor);
    }

    this.anomalyScores.set(ip, existing);

    if (existing.score >= this.ANOMALY_BLOCK_SCORE) {
      console.error(`=« IP ${ip} blocked due to high anomaly score: ${existing.score} (${existing.factors.join(', ')})`);
    }
  }

  /**
   * Track request in burst window
   */
  private trackBurst(ip: string, signature: string): void {
    const now = Date.now();
    let window = this.burstWindows.get(ip);

    if (!window) {
      window = {
        requests: [],
        patterns: new Map(),
        lastReset: now,
      };
      this.burstWindows.set(ip, window);
    }

    // Reset window if needed
    if (now - window.lastReset > this.WINDOW_SIZE) {
      window.requests = [];
      window.patterns.clear();
      window.lastReset = now;
    }

    // Add request
    window.requests.push(now);

    // Remove old requests
    window.requests = window.requests.filter(
      (time) => now - time < this.WINDOW_SIZE
    );
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes

    // Clean burst windows
    for (const [ip, window] of this.burstWindows.entries()) {
      if (now - window.lastReset > MAX_AGE) {
        this.burstWindows.delete(ip);
      }
    }

    // Clean anomaly scores
    for (const [ip, score] of this.anomalyScores.entries()) {
      if (now - score.timestamp > MAX_AGE) {
        this.anomalyScores.delete(ip);
      } else if (score.score > 0) {
        // Decay scores over time
        score.score = Math.max(0, score.score - 5);
      }
    }
  }

  /**
   * Whitelist an IP (e.g., trusted services)
   */
  public whitelistIP(ip: string): void {
    this.whitelistedIPs.add(ip);
    console.log(` Whitelisted IP: ${ip}`);
  }

  /**
   * Middleware function
   */
  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = this.getClientIP(req);

    // Skip whitelisted IPs
    if (this.whitelistedIPs.has(ip)) {
      return next();
    }

    const signature = this.getRequestSignature(req);
    const now = Date.now();

    // Track the request
    this.trackBurst(ip, signature);

    // Run detections
    const microBurst = this.detectMicroBurst(ip, now);
    const sustainedBurst = this.detectSustainedBurst(ip, now);
    const patternDetected = this.detectPattern(ip, signature);

    // Check anomaly score
    const anomaly = this.anomalyScores.get(ip);
    if (anomaly && anomaly.score >= this.ANOMALY_BLOCK_SCORE) {
      res.status(429).json({
        success: false,
        error: {
          code: 'ANOMALY_DETECTED',
          message: 'Suspicious activity detected. Your IP has been temporarily blocked.',
          details: process.env.NODE_ENV !== 'production' ? {
            score: anomaly.score,
            factors: anomaly.factors,
          } : undefined,
        },
      });
      return;
    }

    // Block if micro-burst detected
    if (microBurst) {
      res.status(429).json({
        success: false,
        error: {
          code: 'MICRO_BURST',
          message: 'Excessive request rate detected. Please slow down.',
        },
      });
      return;
    }

    next();
  };

  /**
   * Get statistics
   */
  public getStats() {
    const totalAnomalyScore = Array.from(this.anomalyScores.values())
      .reduce((sum, score) => sum + score.score, 0);

    return {
      trackedIPs: this.burstWindows.size,
      whitelistedIPs: this.whitelistedIPs.size,
      anomaliesDetected: this.anomalyScores.size,
      totalAnomalyScore,
      configuration: {
        windowSize: this.WINDOW_SIZE / 1000,
        microBurstThreshold: this.MICRO_BURST_THRESHOLD,
        sustainedBurstThreshold: this.SUSTAINED_BURST_THRESHOLD,
        patternThreshold: this.PATTERN_THRESHOLD,
      },
    };
  }
}

// Export singleton instance
export const burstDetection = new BurstDetection();
export const burstMiddleware = burstDetection.middleware;
