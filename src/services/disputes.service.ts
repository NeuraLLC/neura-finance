import Stripe from 'stripe';
import db from './database.service';
import { AppError } from '../middleware/errorHandler';
import stripeFileUploadService from './stripeFileUpload.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

interface Dispute {
  id: string;
  merchant_id: string;
  transaction_id?: string;
  stripe_dispute_id: string;
  stripe_charge_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  network_reason_code?: string;
  created_at: string;
  evidence_due_by: string;
  responded_at?: string;
  closed_at?: string;
  evidence_submitted: boolean;
  evidence_details: any;
  merchant_notes?: string;
  metadata: any;
  updated_at: string;
}

interface DisputeEvidence {
  id: string;
  dispute_id: string;
  evidence_type: string;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by: string;
  uploaded_at: string;
  stripe_file_id?: string; // Stripe file ID for evidence submission
}

interface SubmitEvidenceData {
  customer_name?: string;
  customer_email_address?: string;
  customer_purchase_ip?: string;
  billing_address?: string;
  receipt?: string;
  customer_signature?: string;
  shipping_address?: string;
  shipping_date?: string;
  shipping_tracking_number?: string;
  shipping_carrier?: string;
  shipping_documentation?: string;
  refund_policy?: string;
  refund_policy_disclosure?: string;
  cancellation_policy?: string;
  cancellation_policy_disclosure?: string;
  service_date?: string;
  service_documentation?: string;
  duplicate_charge_id?: string;
  duplicate_charge_explanation?: string;
  duplicate_charge_documentation?: string;
  product_description?: string;
  customer_communication?: string;
  uncategorized_text?: string;
  uncategorized_file?: string;
}

class DisputesService {
  /**
   * Get all disputes for a merchant
   */
  async getDisputesByMerchant(
    merchantId: string,
    filters?: {
      status?: string;
      reason?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ disputes: Dispute[]; total: number }> {
    const client = db.getClient();

    let query = client
      .from('disputes')
      .select('*', { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.reason) {
      query = query.eq('reason', filters.reason);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data: disputes, count, error } = await query;

    if (error) {
      throw new AppError('Failed to fetch disputes', 500, 'DATABASE_ERROR');
    }

    return {
      disputes: disputes || [],
      total: count || 0,
    };
  }

  /**
   * Get dispute by ID
   */
  async getDisputeById(disputeId: string): Promise<Dispute> {
    const dispute = await db.findById<Dispute>('disputes', disputeId);

    if (!dispute) {
      throw new AppError('Dispute not found', 404, 'DISPUTE_NOT_FOUND');
    }

    return dispute;
  }

  /**
   * Get dispute by Stripe dispute ID
   */
  async getDisputeByStripeId(stripeDisputeId: string): Promise<Dispute | null> {
    const dispute = await db.findOne<Dispute>('disputes', { stripe_dispute_id: stripeDisputeId });
    return dispute;
  }

  /**
   * Create dispute from Stripe webhook
   */
  async createDisputeFromStripe(stripeDispute: Stripe.Dispute, merchantId: string): Promise<Dispute> {
    const client = db.getClient();

    // Check if dispute already exists
    const existing = await this.getDisputeByStripeId(stripeDispute.id);
    if (existing) {
      return existing;
    }

    // Find transaction by charge ID
    const { data: transaction } = await client
      .from('transactions')
      .select('id')
      .eq('stripe_charge_id', stripeDispute.charge as string)
      .single();

    const disputeData = {
      merchant_id: merchantId,
      transaction_id: transaction?.id || null,
      stripe_dispute_id: stripeDispute.id,
      stripe_charge_id: stripeDispute.charge as string,
      stripe_payment_intent_id: stripeDispute.payment_intent as string || null,
      amount: stripeDispute.amount,
      currency: stripeDispute.currency,
      reason: stripeDispute.reason,
      status: stripeDispute.status,
      network_reason_code: stripeDispute.network_reason_code || null,
      evidence_due_by: new Date(stripeDispute.evidence_details.due_by! * 1000).toISOString(),
      evidence_submitted: stripeDispute.evidence_details.has_evidence || false,
      evidence_details: stripeDispute.evidence || {},
      metadata: stripeDispute.metadata || {},
    };

    const dispute = await db.insert<Dispute>('disputes', disputeData);

    return dispute;
  }

  /**
   * Update dispute from Stripe webhook
   */
  async updateDisputeFromStripe(stripeDispute: Stripe.Dispute): Promise<Dispute> {
    const dispute = await this.getDisputeByStripeId(stripeDispute.id);

    if (!dispute) {
      throw new AppError('Dispute not found', 404, 'DISPUTE_NOT_FOUND');
    }

    const updateData: Partial<Dispute> = {
      status: stripeDispute.status,
      evidence_submitted: stripeDispute.evidence_details.has_evidence || false,
      evidence_details: stripeDispute.evidence || {},
      metadata: stripeDispute.metadata || {},
    };

    if (stripeDispute.status === 'won' || stripeDispute.status === 'lost') {
      updateData.closed_at = new Date().toISOString();
    }

    const updatedDispute = await db.update<Dispute>('disputes', dispute.id, updateData);

    return updatedDispute;
  }

  /**
   * Submit evidence to Stripe
   */
  async submitEvidence(disputeId: string, evidenceData: SubmitEvidenceData): Promise<Dispute> {
    const dispute = await this.getDisputeById(disputeId);

    // Check if evidence deadline has passed
    if (new Date(dispute.evidence_due_by) < new Date()) {
      throw new AppError('Evidence deadline has passed', 400, 'EVIDENCE_DEADLINE_PASSED');
    }

    // Check if dispute is in a state that allows evidence submission
    if (!['needs_response', 'warning_needs_response'].includes(dispute.status)) {
      throw new AppError('Cannot submit evidence for disputes in this status', 400, 'INVALID_DISPUTE_STATUS');
    }

    try {
      // Submit evidence to Stripe
      const updatedStripeDispute = await stripe.disputes.update(dispute.stripe_dispute_id, {
        evidence: evidenceData as any,
      });

      // Update local database
      const updateData: Partial<Dispute> = {
        evidence_submitted: true,
        evidence_details: updatedStripeDispute.evidence || {},
        responded_at: new Date().toISOString(),
        status: updatedStripeDispute.status,
      };

      const updatedDispute = await db.update<Dispute>('disputes', disputeId, updateData);

      return updatedDispute;
    } catch (error: any) {
      throw new AppError(
        'Failed to submit evidence to Stripe',
        500,
        'STRIPE_EVIDENCE_SUBMISSION_FAILED'
      );
    }
  }

  /**
   * Upload evidence file
   */
  async uploadEvidenceFile(
    disputeId: string,
    evidenceType: string,
    fileData: {
      file_url: string;
      file_name?: string;
      file_size?: number;
      mime_type?: string;
      description?: string;
    },
    uploadedBy: string
  ): Promise<DisputeEvidence> {
    const dispute = await this.getDisputeById(disputeId);

    const evidenceFileData = {
      dispute_id: disputeId,
      evidence_type: evidenceType,
      file_url: fileData.file_url,
      file_name: fileData.file_name,
      file_size: fileData.file_size,
      mime_type: fileData.mime_type,
      description: fileData.description,
      uploaded_by: uploadedBy,
    };

    const evidenceFile = await db.insert<DisputeEvidence>('dispute_evidence', evidenceFileData);

    return evidenceFile;
  }

  /**
   * Get evidence files for a dispute
   */
  async getDisputeEvidence(disputeId: string): Promise<DisputeEvidence[]> {
    const client = db.getClient();

    const { data: evidence, error } = await client
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch dispute evidence', 500, 'DATABASE_ERROR');
    }

    return evidence || [];
  }

  /**
   * Accept a dispute (merchant concedes)
   */
  async acceptDispute(disputeId: string): Promise<Dispute> {
    const dispute = await this.getDisputeById(disputeId);

    // Check if dispute can be accepted
    if (!['needs_response', 'warning_needs_response', 'under_review'].includes(dispute.status)) {
      throw new AppError('Cannot accept dispute in this status', 400, 'INVALID_DISPUTE_STATUS');
    }

    try {
      // Close dispute in Stripe (accept it)
      await stripe.disputes.close(dispute.stripe_dispute_id);

      // Update local database
      const updateData: Partial<Dispute> = {
        status: 'lost',
        closed_at: new Date().toISOString(),
      };

      const updatedDispute = await db.update<Dispute>('disputes', disputeId, updateData);

      return updatedDispute;
    } catch (error: any) {
      throw new AppError(
        'Failed to accept dispute in Stripe',
        500,
        'STRIPE_DISPUTE_CLOSE_FAILED'
      );
    }
  }

  /**
   * Add merchant notes to a dispute
   */
  async addMerchantNotes(disputeId: string, notes: string): Promise<Dispute> {
    const dispute = await this.getDisputeById(disputeId);

    const updatedDispute = await db.update<Dispute>('disputes', disputeId, {
      merchant_notes: notes,
    });

    return updatedDispute;
  }

  /**
   * Get dispute statistics for a merchant
   */
  async getDisputeStats(merchantId: string): Promise<{
    total_disputes: number;
    needs_response: number;
    under_review: number;
    won: number;
    lost: number;
    accepted: number;
    total_amount_disputed: number;
    total_amount_lost: number;
    win_rate: string;
  }> {
    const client = db.getClient();

    const { data: disputes, error } = await client
      .from('disputes')
      .select('*')
      .eq('merchant_id', merchantId);

    if (error) {
      throw new AppError('Failed to fetch dispute stats', 500, 'DATABASE_ERROR');
    }

    const totalDisputes = disputes?.length || 0;
    const needsResponse = disputes?.filter(d => d.status === 'needs_response' || d.status === 'warning_needs_response').length || 0;
    const underReview = disputes?.filter(d => d.status === 'under_review' || d.status === 'warning_under_review').length || 0;
    const won = disputes?.filter(d => d.status === 'won').length || 0;
    const lost = disputes?.filter(d => d.status === 'lost').length || 0;
    const accepted = disputes?.filter(d => d.status === 'accepted').length || 0;

    const totalAmountDisputed = disputes?.reduce((sum, d) => sum + d.amount, 0) || 0;
    const totalAmountLost = disputes?.filter(d => d.status === 'lost' || d.status === 'accepted').reduce((sum, d) => sum + d.amount, 0) || 0;

    const closedDisputes = won + lost + accepted;
    const winRate = closedDisputes > 0 ? ((won / closedDisputes) * 100).toFixed(2) : '0.00';

    return {
      total_disputes: totalDisputes,
      needs_response: needsResponse,
      under_review: underReview,
      won,
      lost,
      accepted,
      total_amount_disputed: totalAmountDisputed,
      total_amount_lost: totalAmountLost,
      win_rate: winRate,
    };
  }

  /**
   * Upload file to Stripe for dispute evidence
   */
  async uploadFileToStripe(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    evidenceType: string
  ): Promise<{ stripeFileId: string; evidenceFieldName: string | null }> {
    // Validate file
    const validation = stripeFileUploadService.validateFile(fileBuffer, fileName, mimeType);
    if (!validation.valid) {
      throw new AppError(validation.error || 'File validation failed', 400, 'INVALID_FILE');
    }

    // Get the Stripe evidence field name for this evidence type
    const evidenceFieldName = stripeFileUploadService.getEvidenceFieldName(evidenceType);

    try {
      // Upload to Stripe
      const uploadResult = await stripeFileUploadService.uploadFile({
        fileBuffer,
        fileName,
        mimeType,
        purpose: 'dispute_evidence',
      });

      return {
        stripeFileId: uploadResult.id,
        evidenceFieldName,
      };
    } catch (error: any) {
      throw new AppError(
        `Failed to upload file to Stripe: ${error.message}`,
        500,
        'STRIPE_FILE_UPLOAD_FAILED'
      );
    }
  }

  /**
   * Submit evidence with file references to Stripe
   * This enhanced version handles both text evidence and file uploads
   */
  async submitEvidenceWithFiles(
    disputeId: string,
    evidenceData: SubmitEvidenceData,
    fileReferences?: { [key: string]: string } // Map of evidence field name -> Stripe file ID
  ): Promise<Dispute> {
    const dispute = await this.getDisputeById(disputeId);

    // Check if evidence deadline has passed
    if (new Date(dispute.evidence_due_by) < new Date()) {
      throw new AppError('Evidence deadline has passed', 400, 'EVIDENCE_DEADLINE_PASSED');
    }

    // Check if dispute is in a state that allows evidence submission
    if (!['needs_response', 'warning_needs_response'].includes(dispute.status)) {
      throw new AppError('Cannot submit evidence for disputes in this status', 400, 'INVALID_DISPUTE_STATUS');
    }

    try {
      // Combine text evidence with file references
      const completeEvidence: any = { ...evidenceData };

      if (fileReferences) {
        Object.assign(completeEvidence, fileReferences);
      }

      // Submit evidence to Stripe
      const updatedStripeDispute = await stripe.disputes.update(dispute.stripe_dispute_id, {
        evidence: completeEvidence,
      });

      // Update local database
      const updateData: Partial<Dispute> = {
        evidence_submitted: true,
        evidence_details: updatedStripeDispute.evidence || {},
        responded_at: new Date().toISOString(),
        status: updatedStripeDispute.status,
      };

      const updatedDispute = await db.update<Dispute>('disputes', disputeId, updateData);

      return updatedDispute;
    } catch (error: any) {
      throw new AppError(
        'Failed to submit evidence to Stripe',
        500,
        'STRIPE_EVIDENCE_SUBMISSION_FAILED'
      );
    }
  }

  /**
   * Complete flow: Upload file and record in database
   * This handles the full process of uploading a file to both Stripe and Supabase Storage
   */
  async uploadAndRecordEvidence(
    disputeId: string,
    evidenceType: string,
    fileData: {
      buffer: Buffer;
      fileName: string;
      mimeType: string;
      fileSize: number;
      supabaseUrl: string; // URL from Supabase Storage
      description?: string;
    },
    uploadedBy: string
  ): Promise<{ evidenceFile: DisputeEvidence; stripeFileId: string }> {
    const dispute = await this.getDisputeById(disputeId);

    // Upload to Stripe
    const { stripeFileId } = await this.uploadFileToStripe(
      fileData.buffer,
      fileData.fileName,
      fileData.mimeType,
      evidenceType
    );

    // Record in database
    const evidenceFileData = {
      dispute_id: disputeId,
      evidence_type: evidenceType,
      file_url: fileData.supabaseUrl, // Store Supabase URL for our reference
      file_name: fileData.fileName,
      file_size: fileData.fileSize,
      mime_type: fileData.mimeType,
      description: fileData.description,
      uploaded_by: uploadedBy,
      stripe_file_id: stripeFileId, // Store Stripe file ID for evidence submission
    };

    const evidenceFile = await db.insert<DisputeEvidence>('dispute_evidence', evidenceFileData);

    return {
      evidenceFile,
      stripeFileId,
    };
  }
}

export default new DisputesService();
