const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface RequestOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
}

/**
 * Make authenticated API request with JWT token
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    throw new Error('Not authenticated')
  }

  const method = options.method || 'GET'
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const body = options.body ? JSON.stringify(options.body) : undefined

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body,
  })

  if (!response.ok) {
    // If unauthorized, redirect to login
    if (response.status === 401) {
      localStorage.clear()
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }

    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`)
  }

  const responseData = await response.json()
  // Unwrap the data from the API response structure
  return responseData.data || responseData
}

/**
 * API client methods
 */
export const api = {
  // Transactions
  getTransactions: (limit = 100) =>
    apiRequest<any[]>(`/payments?limit=${limit}`),

  getTransaction: (id: string) =>
    apiRequest<any>(`/payments/${id}`),

  createPayment: (data: any) =>
    apiRequest<any>('/payments', {
      method: 'POST',
      body: data,
    }),

  // Payment Links
  getPaymentLinks: (limit = 100) =>
    apiRequest<any[]>(`/payment-links?limit=${limit}`),

  getPaymentLink: (id: string) =>
    apiRequest<any>(`/payment-links/${id}`),

  createPaymentLink: (data: any) =>
    apiRequest<any>('/payment-links', {
      method: 'POST',
      body: data,
    }),

  updatePaymentLink: (id: string, data: any) =>
    apiRequest<any>(`/payment-links/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  deletePaymentLink: (id: string) =>
    apiRequest<any>(`/payment-links/${id}`, {
      method: 'DELETE',
    }),

  // Refunds
  getRefunds: (limit = 100) =>
    apiRequest<any[]>(`/refunds?limit=${limit}`),

  createRefund: (data: any) =>
    apiRequest<any>('/refunds', {
      method: 'POST',
      body: data,
    }),

  // Stripe Connect
  getStripeConnectStatus: () =>
    apiRequest<any>('/stripe-connect/status'),

  getStripeConnectUrl: () =>
    apiRequest<any>('/stripe-connect/authorize'),

  getStripeDashboardUrl: () =>
    apiRequest<any>('/stripe-connect/dashboard'),

  // Disputes
  getDisputes: (merchantId: string, filters?: { status?: string; reason?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.reason) params.append('reason', filters.reason);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any>(`/merchants/${merchantId}/disputes${query}`);
  },

  getDisputeStats: (merchantId: string) =>
    apiRequest<any>(`/merchants/${merchantId}/disputes/stats`),

  getDispute: (disputeId: string) =>
    apiRequest<any>(`/disputes/${disputeId}`),

  submitEvidence: (disputeId: string, evidence: any) =>
    apiRequest<any>(`/disputes/${disputeId}/evidence`, {
      method: 'POST',
      body: evidence,
    }),

  getDisputeEvidence: (disputeId: string) =>
    apiRequest<any>(`/disputes/${disputeId}/evidence`),

  uploadEvidenceFile: (disputeId: string, fileData: any) =>
    apiRequest<any>(`/disputes/${disputeId}/evidence/upload`, {
      method: 'POST',
      body: fileData,
    }),

  acceptDispute: (disputeId: string) =>
    apiRequest<any>(`/disputes/${disputeId}/accept`, {
      method: 'POST',
    }),

  updateDisputeNotes: (disputeId: string, notes: string) =>
    apiRequest<any>(`/disputes/${disputeId}/notes`, {
      method: 'PUT',
      body: { notes },
    }),
}
