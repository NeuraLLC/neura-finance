import { PostHog } from 'posthog-node';

class PostHogService {
  private client: PostHog | null = null;

  constructor() {
    if (process.env.POSTHOG_API_KEY) {
      this.client = new PostHog(process.env.POSTHOG_API_KEY, {
        host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
      });
    } else {
      console.warn('PostHog API Key not found. Analytics will be disabled.');
    }
  }

  /**
   * Capture an event
   */
  capture(distinctId: string, event: string, properties: Record<string, any> = {}) {
    if (!this.client) return;

    try {
      this.client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (error) {
      console.error('PostHog capture error:', error);
    }
  }

  /**
   * Identify a user
   */
  identify(distinctId: string, properties: Record<string, any> = {}) {
    if (!this.client) return;

    try {
      this.client.identify({
        distinctId,
        properties,
      });
    } catch (error) {
      console.error('PostHog identify error:', error);
    }
  }

  /**
   * Capture an error
   */
  captureError(error: Error, context: Record<string, any> = {}) {
    if (!this.client) return;

    try {
      const distinctId = context.userId || context.merchantId || 'system';
      this.client.capture({
        distinctId,
        event: 'error_occurred',
        properties: {
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack,
          ...context,
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (err) {
      console.error('PostHog captureError error:', err);
    }
  }

  /**
   * Capture a log entry
   */
  captureLog(message: string, level: 'info' | 'warn' | 'error', context: Record<string, any> = {}) {
    if (!this.client) return;

    try {
      const distinctId = context.userId || context.merchantId || 'system';
      this.client.capture({
        distinctId,
        event: `log_${level}`,
        properties: {
          log_message: message,
          log_level: level,
          ...context,
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (error) {
      console.error('PostHog captureLog error:', error);
    }
  }

  /**
   * Shutdown client
   */
  async shutdown() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}

export default new PostHogService();
