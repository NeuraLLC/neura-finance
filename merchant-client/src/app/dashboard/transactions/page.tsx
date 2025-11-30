'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, getStatusBadgeClass, copyToClipboard } from '@/lib/utils'
import type { Transaction } from '@/types'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions(100)
      setTransactions(data)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    // Filter by status
    if (filter !== 'all' && transaction.status !== filter) {
      return false
    }

    // Search by ID or description
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        transaction.id.toLowerCase().includes(search) ||
        transaction.description?.toLowerCase().includes(search)
      )
    }

    return true
  })

  const handleCopyId = async (id: string) => {
    const success = await copyToClipboard(id)
    if (success) {
      // Show toast notification (you can add a toast library)
      console.log('Copied to clipboard')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Transactions</h1>
        <p className="text-secondary mt-1">
          View and manage all your payment transactions
        </p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID or description..."
              className="input pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="sm:w-48">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input"
          >
            <option value="all">All statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Total</p>
          <p className="text-2xl font-semibold text-foreground">
            {transactions.length}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Succeeded</p>
          <p className="text-2xl font-semibold text-success">
            {transactions.filter((t) => t.status === 'succeeded').length}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Pending</p>
          <p className="text-2xl font-semibold text-warning">
            {transactions.filter((t) => t.status === 'pending' || t.status === 'processing').length}
          </p>
        </div>
        <div className="bg-card rounded-apple p-4 border border-border">
          <p className="text-xs text-secondary mb-1">Failed</p>
          <p className="text-2xl font-semibold text-error">
            {transactions.filter((t) => t.status === 'failed').length}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card p-0 overflow-hidden">
        {filteredTransactions.length === 0 ? (
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-secondary text-sm">No transactions found</p>
            <p className="text-secondary text-xs mt-1">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first payment to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-card transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {transaction.description || 'Payment'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-secondary font-mono">
                          {transaction.id.slice(0, 12)}...
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyId(transaction.id)
                          }}
                          className="text-secondary hover:text-foreground transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      {transaction.refunded && (
                        <div className="text-xs text-error">
                          -{formatCurrency(transaction.refunded_amount, transaction.currency)} refunded
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {transaction.payment_method === 'card' ? (
                          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className="text-sm text-secondary capitalize">
                          {transaction.payment_method}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClass(transaction.status)}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {formatDateTime(transaction.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTransaction(transaction)
                        }}
                        className="text-accent hover:text-accent/80 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Transaction Details
                </h2>
                <p className="text-sm text-secondary mt-1">
                  {selectedTransaction.description || 'Payment'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-secondary hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={getStatusBadgeClass(selectedTransaction.status)}>
                {selectedTransaction.status}
              </span>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <p className="text-sm text-secondary mb-1">Amount</p>
              <p className="text-4xl font-semibold text-foreground">
                {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-secondary mb-1">Transaction ID</p>
                  <p className="text-sm text-foreground font-mono break-all">
                    {selectedTransaction.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Payment Method</p>
                  <p className="text-sm text-foreground capitalize">
                    {selectedTransaction.payment_method}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Platform Fee</p>
                  <p className="text-sm text-foreground">
                    {formatCurrency(selectedTransaction.platform_fee, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Your Amount</p>
                  <p className="text-sm text-foreground font-medium">
                    {formatCurrency(selectedTransaction.merchant_amount, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Created</p>
                  <p className="text-sm text-foreground">
                    {formatDateTime(selectedTransaction.created_at)}
                  </p>
                </div>
                {selectedTransaction.succeeded_at && (
                  <div>
                    <p className="text-xs text-secondary mb-1">Completed</p>
                    <p className="text-sm text-foreground">
                      {formatDateTime(selectedTransaction.succeeded_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Refund Info */}
              {selectedTransaction.refunded && (
                <div className="bg-error/5 border border-error/20 rounded-apple p-4">
                  <p className="text-sm font-medium text-error mb-1">Refunded</p>
                  <p className="text-sm text-foreground">
                    {formatCurrency(selectedTransaction.refunded_amount, selectedTransaction.currency)}
                  </p>
                  {selectedTransaction.refunded_at && (
                    <p className="text-xs text-secondary mt-1">
                      {formatDateTime(selectedTransaction.refunded_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Failure Info */}
              {selectedTransaction.status === 'failed' && selectedTransaction.failure_message && (
                <div className="bg-error/5 border border-error/20 rounded-apple p-4">
                  <p className="text-sm font-medium text-error mb-1">Failure Reason</p>
                  <p className="text-sm text-foreground">
                    {selectedTransaction.failure_message}
                  </p>
                  {selectedTransaction.failure_code && (
                    <p className="text-xs text-secondary mt-1 font-mono">
                      Code: {selectedTransaction.failure_code}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedTransaction.status === 'succeeded' && !selectedTransaction.refunded && (
              <div className="mt-6 pt-6 border-t border-border">
                <button className="btn-secondary w-full">
                  Issue Refund
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
