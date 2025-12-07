'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, copyToClipboard, getPaymentLinkUrl } from '@/lib/utils'
import type { PaymentLink } from '@/types'

export default function PaymentLinksPage() {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)

  useEffect(() => {
    loadPaymentLinks()
  }, [])

  const loadPaymentLinks = async () => {
    try {
      const data = await api.getPaymentLinks(100)
      setPaymentLinks(data)
    } catch (error) {
      console.error('Failed to load payment links:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async (slug: string) => {
    const url = getPaymentLinkUrl(slug)
    const success = await copyToClipboard(url)
    if (success) {
      console.log('Link copied to clipboard')
    }
  }

  const handleDeactivateLink = async (id: string) => {
    try {
      await api.deletePaymentLink(id)
      await loadPaymentLinks()
    } catch (error) {
      console.error('Failed to deactivate link:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading payment links...</div>
      </div>
    )
  }

  const activeLinks = paymentLinks.filter((link) => link.is_active)
  const totalRevenue = paymentLinks.reduce((sum, link) => sum + link.total_collected, 0)
  const totalViews = paymentLinks.reduce((sum, link) => sum + link.view_count, 0)
  const totalPayments = paymentLinks.reduce((sum, link) => sum + link.payment_count, 0)
  const conversionRate = totalViews > 0 ? ((totalPayments / totalViews) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Payment Links</h1>
          <p className="text-secondary mt-1">
            Create shareable payment links for your products and services
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Active Links</p>
          <p className="text-2xl font-semibold text-foreground">
            {activeLinks.length}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Total Payments</p>
          <p className="text-2xl font-semibold text-success">
            {totalPayments}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatCurrency(totalRevenue, 'USD')}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Conversion Rate</p>
          <p className="text-2xl font-semibold text-accent">
            {conversionRate}%
          </p>
        </div>
      </div>

      {/* Payment Links Grid */}
      {paymentLinks.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-secondary/30 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No payment links yet
            </h3>
            <p className="text-secondary text-sm mb-6">
              Create your first payment link to start accepting payments
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Payment Link
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paymentLinks.map((link) => (
            <div
              key={link.id}
              className="card-hover cursor-pointer"
              onClick={() => setSelectedLink(link)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {link.description || 'Payment Link'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary font-mono">
                      {link.slug}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyLink(link.slug)
                      }}
                      className="text-secondary hover:text-foreground transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <span className={link.is_active ? 'badge-success' : 'badge-secondary'}>
                  {link.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Amount */}
              <div className="mb-4">
                {link.allow_custom_amount ? (
                  <div>
                    <p className="text-2xl font-semibold text-foreground">
                      Custom Amount
                    </p>
                    {link.min_amount && link.max_amount && (
                      <p className="text-sm text-secondary">
                        {formatCurrency(link.min_amount, link.currency)} - {formatCurrency(link.max_amount, link.currency)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-semibold text-foreground">
                    {formatCurrency(link.amount || 0, link.currency)}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                <div>
                  <p className="text-xs text-secondary mb-1">Views</p>
                  <p className="text-lg font-medium text-foreground">
                    {link.view_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Payments</p>
                  <p className="text-lg font-medium text-success">
                    {link.payment_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Revenue</p>
                  <p className="text-lg font-medium text-foreground">
                    {formatCurrency(link.total_collected, link.currency)}
                  </p>
                </div>
              </div>

              {/* Conversion Rate */}
              {link.view_count > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-secondary">Conversion Rate</span>
                    <span className="text-sm font-medium text-foreground">
                      {((link.payment_count / link.view_count) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success transition-all duration-500"
                      style={{
                        width: `${Math.min((link.payment_count / link.view_count) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Expiry */}
              {link.expires_at && (
                <div className="mt-4 text-xs text-secondary">
                  Expires: {formatDateTime(link.expires_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePaymentLinkModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadPaymentLinks()
          }}
        />
      )}

      {/* Details Modal */}
      {selectedLink && (
        <PaymentLinkDetailsModal
          link={selectedLink}
          onClose={() => setSelectedLink(null)}
          onDeactivate={handleDeactivateLink}
          onCopyLink={handleCopyLink}
        />
      )}
    </div>
  )
}

// Create Payment Link Modal
function CreatePaymentLinkModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'usd',
    allow_custom_amount: false,
    min_amount: '',
    max_amount: '',
    expires_at: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data: any = {
        description: formData.description,
        currency: formData.currency,
        allow_custom_amount: formData.allow_custom_amount,
      }

      if (formData.allow_custom_amount) {
        if (formData.min_amount) data.min_amount = parseInt(formData.min_amount) * 100
        if (formData.max_amount) data.max_amount = parseInt(formData.max_amount) * 100
      } else {
        data.amount = parseInt(formData.amount) * 100
      }

      if (formData.expires_at) {
        data.expires_at = new Date(formData.expires_at).toISOString()
      }

      await api.createPaymentLink(data)
      onSuccess()
    } catch (error) {
      console.error('Failed to create payment link:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Create Payment Link
            </h2>
            <p className="text-sm text-secondary mt-1">
              Generate a shareable link to accept payments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              placeholder="Product or service name"
              required
            />
          </div>

          {/* Allow Custom Amount */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allow_custom_amount"
              checked={formData.allow_custom_amount}
              onChange={(e) => setFormData({ ...formData, allow_custom_amount: e.target.checked })}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <label htmlFor="allow_custom_amount" className="text-sm font-medium text-foreground">
              Allow customer to set amount
            </label>
          </div>

          {/* Amount Fields */}
          {formData.allow_custom_amount ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Min Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                  className="input"
                  placeholder="10"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Max Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.max_amount}
                  onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                  className="input"
                  placeholder="1000"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input"
                placeholder="50.00"
                required={!formData.allow_custom_amount}
                min="0"
                step="0.01"
              />
            </div>
          )}

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Payment Link Details Modal
function PaymentLinkDetailsModal({
  link,
  onClose,
  onDeactivate,
  onCopyLink,
}: {
  link: PaymentLink
  onClose: () => void
  onDeactivate: (id: string) => void
  onCopyLink: (slug: string) => void
}) {
  const linkUrl = getPaymentLinkUrl(link.slug)

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {link.description || 'Payment Link'}
            </h2>
            <p className="text-sm text-secondary mt-1">
              {link.slug}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Link URL */}
        <div className="bg-card border border-border rounded-apple p-4 mb-6">
          <p className="text-xs text-secondary mb-2">Payment Link URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-foreground break-all">
              {linkUrl}
            </code>
            <button
              onClick={() => onCopyLink(link.slug)}
              className="btn-secondary shrink-0"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-card rounded-apple">
            <p className="text-2xl font-semibold text-foreground">
              {link.view_count}
            </p>
            <p className="text-xs text-secondary mt-1">Views</p>
          </div>
          <div className="text-center p-4 bg-card rounded-apple">
            <p className="text-2xl font-semibold text-success">
              {link.payment_count}
            </p>
            <p className="text-xs text-secondary mt-1">Payments</p>
          </div>
          <div className="text-center p-4 bg-card rounded-apple">
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(link.total_collected, link.currency)}
            </p>
            <p className="text-xs text-secondary mt-1">Revenue</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-6">
          <div>
            <p className="text-xs text-secondary mb-1">Amount</p>
            {link.allow_custom_amount ? (
              <p className="text-sm text-foreground">
                Custom amount
                {link.min_amount && link.max_amount && (
                  <span className="text-secondary">
                    {' '}({formatCurrency(link.min_amount, link.currency)} - {formatCurrency(link.max_amount, link.currency)})
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-foreground font-medium">
                {formatCurrency(link.amount || 0, link.currency)}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs text-secondary mb-1">Accepted Payment Methods</p>
            <div className="flex gap-2">
              {link.accepted_payment_methods.map((method) => (
                <span key={method} className="badge-secondary capitalize">
                  {method}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-secondary mb-1">Status</p>
            <span className={link.is_active ? 'badge-success' : 'badge-secondary'}>
              {link.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {link.expires_at && (
            <div>
              <p className="text-xs text-secondary mb-1">Expires</p>
              <p className="text-sm text-foreground">
                {formatDateTime(link.expires_at)}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-secondary mb-1">Created</p>
            <p className="text-sm text-foreground">
              {formatDateTime(link.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        {link.is_active && (
          <div className="pt-6 border-t border-border">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to deactivate this payment link?')) {
                  onDeactivate(link.id)
                  onClose()
                }
              }}
              className="btn-secondary w-full text-error"
            >
              Deactivate Link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
