import db from './database.service';
import { AppError } from '../middleware/errorHandler';
import posthogService from './posthog.service';

export interface LedgerEntry {
  id: string;
  merchant_id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description?: string;
  status: 'pending' | 'available' | 'failed';
  metadata?: any;
  created_at: string;
}

class LedgerService {
  /**
   * Add a ledger entry and update balance
   */
  async addEntry(
    merchantId: string,
    type: 'credit' | 'debit',
    amount: number,
    currency: string,
    description: string,
    status: 'pending' | 'available' = 'pending',
    metadata: any = {}
  ): Promise<{ entry_id: string; new_balance?: number; new_pending?: number }> {
    try {
      const { data, error } = await db.getClient().rpc('add_ledger_entry', {
        p_merchant_id: merchantId,
        p_type: type,
        p_amount: amount,
        p_currency: currency,
        p_description: description,
        p_status: status,
        p_metadata: metadata,
      });

      if (error) {
        throw error;
      }

      // Track event
      posthogService.capture(merchantId, 'ledger_entry_created', {
        type,
        amount,
        currency,
        status,
        description,
      });

      return data;
    } catch (error: any) {
      console.error('Ledger addEntry error:', error);
      throw new AppError(
        `Failed to add ledger entry: ${error.message}`,
        500,
        'LEDGER_ERROR'
      );
    }
  }

  /**
   * Get Merchant Balance
   */
  async getBalance(merchantId: string): Promise<{ available: number; pending: number; currency: string }> {
    const merchant = await db.findById('merchants', merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    return {
      available: merchant.balance || 0,
      pending: merchant.pending_balance || 0,
      currency: merchant.currency || 'USD',
    };
  }

  /**
   * Get Ledger History
   */
  async getHistory(merchantId: string, limit: number = 20, offset: number = 0): Promise<LedgerEntry[]> {
    return await db.findMany<LedgerEntry>(
      'ledger_entries',
      { merchant_id: merchantId },
      { limit, offset, orderBy: 'created_at:desc' }
    );
  }

  /**
   * Release pending funds to available balance
   */
  async releaseFunds(merchantId: string): Promise<void> {
    const balance = await this.getBalance(merchantId);
    if (balance.pending <= 0) return;

    // We need to move funds atomically.
    // 1. Debit Pending
    await this.addEntry(
      merchantId,
      'debit',
      balance.pending,
      balance.currency,
      'Release pending funds after verification',
      'pending'
    );

    // 2. Credit Available
    await this.addEntry(
      merchantId,
      'credit',
      balance.pending,
      balance.currency,
      'Funds released from pending',
      'available'
    );
  }
}

export default new LedgerService();
