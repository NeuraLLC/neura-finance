// Merchant types
export interface Merchant {
  id: string
  business_name: string
  business_email: string
  business_type?: string
  api_key: string
  webhook_url?: string
  webhook_secret?: string
  stripe_account_id?: string
  stripe_onboarding_complete: boolean
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  status: 'active' | 'inactive' | 'pending_verification'
  brand_color?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

// Transaction types
export interface Transaction {
  id: string
  merchant_id: string
  customer_id?: string
  amount: number
  currency: string
  description?: string
  payment_method: 'card' | 'crypto'
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  platform_fee: number
  merchant_amount: number
  refunded: boolean
  refunded_amount: number
  failure_code?: string
  failure_message?: string
  payment_method_details?: any
  metadata?: Record<string, any>
  pending_at?: string
  processing_at?: string
  succeeded_at?: string
  failed_at?: string
  refunded_at?: string
  created_at: string
  updated_at: string
}

// Payment Link types
export interface PaymentLink {
  id: string
  merchant_id: string
  slug: string
  amount?: number
  currency: string
  description?: string
  allow_custom_amount: boolean
  min_amount?: number
  max_amount?: number
  accepted_payment_methods: string[]
  is_active: boolean
  expires_at?: string
  metadata?: Record<string, any>
  view_count: number
  payment_count: number
  total_collected: number
  created_at: string
  updated_at: string
}

// Refund types
export interface Refund {
  id: string
  transaction_id: string
  merchant_id: string
  amount: number
  reason?: string
  status: 'pending' | 'succeeded' | 'failed'
  stripe_refund_id?: string
  created_at: string
  updated_at: string
}

// Stats types
export interface DashboardStats {
  total_revenue: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  refunded_transactions: number
  pending_transactions: number
  revenue_change: number
  transaction_change: number
}

// API Response types
export interface APIResponse<T> {
  data?: T
  error?: string
  message?: string
}
