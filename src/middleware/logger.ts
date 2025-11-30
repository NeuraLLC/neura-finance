import { Request, Response, NextFunction } from 'express';

/**
 * Log entry interface
 */
interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: string;
  ip: string | undefined;
  userAgent: string | undefined;
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log on response finish
  res.on('finish', (): void => {
    const duration = Date.now() - start;
    const log: LogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || (req.connection && req.connection.remoteAddress),
      userAgent: req.get('user-agent'),
    };

    // Color coding for different status codes
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : // Red for 5xx
                        res.statusCode >= 400 ? '\x1b[33m' : // Yellow for 4xx
                        res.statusCode >= 300 ? '\x1b[36m' : // Cyan for 3xx
                        '\x1b[32m'; // Green for 2xx

    const reset = '\x1b[0m';

    console.log(
      `${log.timestamp} | ${statusColor}${log.statusCode}${reset} | ${log.method} ${log.path} | ${log.duration}`
    );

    // Log additional details in development
    if (process.env.NODE_ENV !== 'production' && res.statusCode >= 400) {
      console.log('  IP:', log.ip);
      console.log('  User-Agent:', log.userAgent);
    }
  });

  next();
};
