import db from './database.service';

export interface Notification {
  id?: string;
  merchant_id: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  read: boolean;
  created_at?: string;
}

class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Promise<Notification> {
    const newNotification = await db.insert<Notification>('notifications', {
      ...notification,
      read: false,
    });

    console.log(`📬 Notification created for merchant ${notification.merchant_id}: ${notification.title}`);

    return newNotification;
  }

  /**
   * Get unread notifications for a merchant
   */
  async getUnreadNotifications(merchantId: string): Promise<Notification[]> {
    const client = db.getClient();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all notifications for a merchant
   */
  async getAllNotifications(merchantId: string, limit: number = 50): Promise<Notification[]> {
    const client = db.getClient();
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await db.update<Notification>('notifications', notificationId, {
      read: true,
    } as any);
  }

  /**
   * Mark all notifications as read for a merchant
   */
  async markAllAsRead(merchantId: string): Promise<void> {
    const client = db.getClient();
    await client
      .from('notifications')
      .update({ read: true })
      .eq('merchant_id', merchantId)
      .eq('read', false);
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<void> {
    const client = db.getClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await client
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', cutoffDate.toISOString());
  }

  /**
   * Create onboarding completed notification
   */
  async createOnboardingCompletedNotification(
    merchantId: string,
    transferAmount: number,
    currency: string
  ): Promise<Notification> {
    // Format message based on whether there was a pending amount
    const message = transferAmount > 0
      ? `Your account is now fully verified. ${(transferAmount / 100).toFixed(2)} ${currency.toUpperCase()} from your pending payments has been transferred to your account.`
      : 'Your account is now fully verified. You can now start accepting payments!';

    return this.createNotification({
      merchant_id: merchantId,
      type: 'success',
      title: 'Verification Complete! 🎉',
      message,
      action_url: '/dashboard',
      action_label: 'View Dashboard',
    });
  }
}

export default new NotificationService();
