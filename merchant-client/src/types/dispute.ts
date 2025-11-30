export interface Dispute {
  id: string;
  merchant_id: string;
  transaction_id?: string;
  stripe_dispute_id: string;
  stripe_charge_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency: string;
  reason: string;
  status: DisputeStatus;
  network_reason_code?: string;
  created_at: string;
  evidence_due_by: string;
  responded_at?: string;
  closed_at?: string;
  evidence_submitted: boolean;
  evidence_details: Record<string, any>;
  merchant_notes?: string;
  metadata: Record<string, any>;
  updated_at: string;
}

export type DisputeStatus =
  | 'warning_needs_response'
  | 'warning_under_review'
  | 'warning_closed'
  | 'needs_response'
  | 'under_review'
  | 'won'
  | 'lost'
  | 'accepted';

export type DisputeReason =
  | 'fraudulent'
  | 'unrecognized'
  | 'duplicate'
  | 'subscription_canceled'
  | 'product_unacceptable'
  | 'credit_not_processed'
  | 'general';

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  evidence_type: EvidenceType;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export type EvidenceType =
  | 'receipt'
  | 'customer_communication'
  | 'shipping_documentation'
  | 'refund_policy'
  | 'billing_agreement'
  | 'cancellation_policy'
  | 'customer_signature'
  | 'service_documentation'
  | 'duplicate_charge_documentation'
  | 'uncategorized';

export interface SubmitEvidenceData {
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

export interface DisputeStats {
  total_disputes: number;
  needs_response: number;
  under_review: number;
  won: number;
  lost: number;
  accepted: number;
  total_amount_disputed: number;
  total_amount_lost: number;
  win_rate: string;
}

export interface DisputeFilters {
  status?: DisputeStatus;
  reason?: DisputeReason;
  limit?: number;
  offset?: number;
}

export interface DisputesResponse {
  success: boolean;
  data: {
    disputes: Dispute[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface DisputeStatsResponse {
  success: boolean;
  data: DisputeStats;
}

export interface UploadEvidenceFileData {
  evidence_type: EvidenceType;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
}

// Helper functions for status colors and labels
export const getDisputeStatusColor = (status: DisputeStatus): string => {
  switch (status) {
    case 'needs_response':
    case 'warning_needs_response':
      return 'red';
    case 'under_review':
    case 'warning_under_review':
      return 'yellow';
    case 'won':
      return 'green';
    case 'lost':
    case 'accepted':
      return 'gray';
    default:
      return 'gray';
  }
};

export const getDisputeStatusLabel = (status: DisputeStatus): string => {
  switch (status) {
    case 'needs_response':
      return 'Needs Response';
    case 'warning_needs_response':
      return 'Early Warning - Needs Response';
    case 'under_review':
      return 'Under Review';
    case 'warning_under_review':
      return 'Early Warning - Under Review';
    case 'won':
      return 'Won';
    case 'lost':
      return 'Lost';
    case 'accepted':
      return 'Accepted';
    case 'warning_closed':
      return 'Early Warning - Closed';
    default:
      return status;
  }
};

export const getDisputeReasonLabel = (reason: DisputeReason): string => {
  switch (reason) {
    case 'fraudulent':
      return 'Fraudulent';
    case 'unrecognized':
      return 'Unrecognized';
    case 'duplicate':
      return 'Duplicate Charge';
    case 'subscription_canceled':
      return 'Subscription Canceled';
    case 'product_unacceptable':
      return 'Product Unacceptable';
    case 'credit_not_processed':
      return 'Credit Not Processed';
    case 'general':
      return 'General';
    default:
      return reason;
  }
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export const isDisputeActionable = (dispute: Dispute): boolean => {
  return (
    dispute.status === 'needs_response' ||
    dispute.status === 'warning_needs_response'
  ) && new Date(dispute.evidence_due_by) > new Date();
};

export const getTimeUntilDeadline = (evidenceDueBy: string): string => {
  const now = new Date();
  const deadline = new Date(evidenceDueBy);
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffMs < 0) {
    return 'Deadline passed';
  }

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`;
  }

  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} remaining`;
  }

  return 'Less than 1 hour remaining';
};
