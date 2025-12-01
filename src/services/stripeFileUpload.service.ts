/**
 * Stripe File Upload Service
 * Handles uploading files to Stripe for dispute evidence
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export interface UploadFileToStripeParams {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  purpose: 'dispute_evidence' | 'identity_document' | 'business_logo';
}

export interface StripeFileUploadResult {
  id: string;
  object: string;
  created: number;
  expires_at: number | null;
  filename: string;
  purpose: string;
  size: number;
  title: string | null;
  type: string | null;
  url: string | null;
}

class StripeFileUploadService {
  /**
   * Upload a file to Stripe
   * Files must be uploaded to Stripe before being referenced in dispute evidence
   */
  async uploadFile(params: UploadFileToStripeParams): Promise<StripeFileUploadResult> {
    const { fileBuffer, fileName, mimeType, purpose } = params;

    try {
      // Upload file to Stripe using Buffer directly
      const file = await stripe.files.create({
        purpose: purpose,
        file: {
          data: fileBuffer,
          name: fileName,
          type: mimeType,
        },
      });

      return {
        id: file.id,
        object: file.object,
        created: file.created,
        expires_at: file.expires_at,
        filename: file.filename,
        purpose: file.purpose,
        size: file.size,
        title: file.title,
        type: file.type,
        url: file.url,
      };
    } catch (error: any) {
      console.error('Stripe file upload error:', error);
      throw new Error(`Failed to upload file to Stripe: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to Stripe
   */
  async uploadMultipleFiles(
    files: UploadFileToStripeParams[]
  ): Promise<StripeFileUploadResult[]> {
    try {
      const uploadPromises = files.map((file) => this.uploadFile(file));
      return await Promise.all(uploadPromises);
    } catch (error: any) {
      console.error('Multiple file upload error:', error);
      throw new Error(`Failed to upload files to Stripe: ${error.message}`);
    }
  }

  /**
   * Retrieve file information from Stripe
   */
  async retrieveFile(fileId: string): Promise<Stripe.File> {
    try {
      return await stripe.files.retrieve(fileId);
    } catch (error: any) {
      console.error('Stripe file retrieval error:', error);
      throw new Error(`Failed to retrieve file from Stripe: ${error.message}`);
    }
  }

  /**
   * List all files uploaded to Stripe
   */
  async listFiles(
    purpose?: 'dispute_evidence' | 'identity_document' | 'business_logo',
    limit: number = 100
  ): Promise<Stripe.File[]> {
    try {
      const params: Stripe.FileListParams = { limit };
      if (purpose) {
        params.purpose = purpose;
      }

      const files = await stripe.files.list(params);
      return files.data;
    } catch (error: any) {
      console.error('Stripe file list error:', error);
      throw new Error(`Failed to list files from Stripe: ${error.message}`);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(fileBuffer: Buffer, fileName: string, mimeType: string): { valid: boolean; error?: string } {
    // Check file size (max 8MB for Stripe)
    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of 8MB. Current size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    // Check file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `File type not allowed: ${mimeType}. Allowed types: PDF, Images, Documents, Spreadsheets`,
      };
    }

    // Check filename
    if (!fileName || fileName.length === 0) {
      return {
        valid: false,
        error: 'File name is required',
      };
    }

    return { valid: true };
  }

  /**
   * Get evidence field name for file upload
   * Maps evidence type to Stripe's evidence field names
   */
  getEvidenceFieldName(evidenceType: string): string | null {
    const evidenceFieldMap: Record<string, string> = {
      receipt: 'receipt',
      customer_communication: 'customer_communication',
      shipping_documentation: 'shipping_documentation',
      refund_policy: 'refund_policy',
      billing_agreement: 'billing_agreement',
      cancellation_policy: 'cancellation_policy',
      customer_signature: 'customer_signature',
      service_documentation: 'service_documentation',
      duplicate_charge_documentation: 'duplicate_charge_documentation',
      uncategorized_file: 'uncategorized_file',
    };

    return evidenceFieldMap[evidenceType] || null;
  }
}

export default new StripeFileUploadService();
