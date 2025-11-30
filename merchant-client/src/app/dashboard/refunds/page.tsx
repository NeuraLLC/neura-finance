'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, getStatusBadgeClass } from '@/lib/utils'
import type { Refund, Transaction } from '@/types'

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [refundsData, transactionsData] = await Promise.all([
        api.getRefunds(100),
        api.getTransactions(100),
      ])
      setRefunds(refundsData)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading refunds...</div>
      </div>
    )
  }

  const totalRefunded = refunds
    .filter((r) => r.status === 'succeeded')
    .reduce((sum, r) => sum + r.amount, 0)

  const successfulRefunds = refunds.filter((r) => r.status === 'succeeded').length
  const pendingRefunds = refunds.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Refunds</h1>
          <p className="text-secondary mt-1">
            View and process refunds for your transactions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Issue Refund
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Total Refunded</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatCurrency(totalRefunded, 'USD')}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Successful</p>
          <p className="text-2xl font-semibold text-success">
            {successfulRefunds}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Pending</p>
          <p className="text-2xl font-semibold text-warning">
            {pendingRefunds}
          </p>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="card p-0 overflow-hidden">
        {refunds.length === 0 ? (
          <div className="p-12 text-center">
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
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No refunds yet
            </h3>
            <p className="text-secondary text-sm mb-6">
              Refunds will appear here when you process them
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Issue First Refund
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Refund ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refunds.map((refund) => {
                  const transaction = transactions.find((t) => t.id === refund.transaction_id)

                  return (
                    <tr key={refund.id} className="hover:bg-card transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-foreground">
                          {refund.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {transaction?.description || 'Payment'}
                        </div>
                        <div className="text-xs text-secondary font-mono">
                          {refund.transaction_id.slice(0, 12)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-error">
                          -{formatCurrency(refund.amount, 'USD')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-secondary">
                          {refund.reason || 'No reason provided'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getStatusBadgeClass(refund.status)}>
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">
                        {formatDateTime(refund.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Refund Modal */}
      {showCreateModal && (
        <CreateRefundModal
          transactions={transactions}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

// Create Refund Modal
function CreateRefundModal({
  transactions,
  onClose,
  onSuccess,
}: {
  transactions: Transaction[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [formData, setFormData] = useState({
    transaction_id: '',
    amount: '',
    reason: '',
  })

  // Only show transactions that can be refunded
  const refundableTransactions = transactions.filter(
    (t) => t.status === 'succeeded' && (!t.refunded || t.refunded_amount < t.amount)
  )

  const handleTransactionSelect = (transactionId: string) => {
    const transaction = transactions.find((t) => t.id === transactionId)
    setSelectedTransaction(transaction || null)
    setFormData({ ...formData, transaction_id: transactionId })
  }

  const maxRefundAmount = selectedTransaction
    ? (selectedTransaction.amount - selectedTransaction.refunded_amount) / 100
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data: any = {
        transaction_id: formData.transaction_id,
        reason: formData.reason,
      }

      if (formData.amount) {
        data.amount = parseFloat(formData.amount) * 100
      }

      await api.createRefund(data)
      onSuccess()
    } catch (error) {
      console.error('Failed to create refund:', error)
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
            <h2 className="text-2xl font-semibold text-foreground">Issue Refund</h2>
            <p className="text-sm text-secondary mt-1">
              Process a full or partial refund
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

        {refundableTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-secondary text-sm">
              No transactions available for refund
            </p>
            <p className="text-secondary text-xs mt-2">
              Only successful transactions can be refunded
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Transaction Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Transaction
              </label>
              <select
                value={formData.transaction_id}
                onChange={(e) => handleTransactionSelect(e.target.value)}
                className="input"
                required
              >
                <option value="">Choose a transaction...</option>
                {refundableTransactions.map((transaction) => (
                  <option key={transaction.id} value={transaction.id}>
                    {transaction.description || 'Payment'} -{' '}
                    {formatCurrency(transaction.amount, transaction.currency)} -{' '}
                    {formatDateTime(transaction.created_at)}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Details */}
            {selectedTransaction && (
              <div className="bg-card border border-border rounded-apple p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-secondary mb-1">Total Amount</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary mb-1">Already Refunded</p>
                    <p className="text-sm font-medium text-error">
                      {formatCurrency(selectedTransaction.refunded_amount, selectedTransaction.currency)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-secondary mb-1">Available to Refund</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(
                        selectedTransaction.amount - selectedTransaction.refunded_amount,
                        selectedTransaction.currency
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Refund Amount ($)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input"
                placeholder={`Max: ${maxRefundAmount.toFixed(2)}`}
                max={maxRefundAmount}
                min="0"
                step="0.01"
                disabled={!selectedTransaction}
              />
              <p className="text-xs text-secondary mt-1">
                Leave empty for full refund
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="input min-h-[80px]"
                placeholder="Explain why this refund is being issued..."
              />
            </div>

            {/* Warning */}
            <div className="bg-warning/10 border border-warning/20 rounded-apple p-4">
              <p className="text-sm text-warning">
                ⚠️ Refunds are processed immediately and cannot be undone
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedTransaction}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed bg-error hover:bg-error/90"
              >
                {loading ? 'Processing...' : 'Issue Refund'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
