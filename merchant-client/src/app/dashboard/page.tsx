'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatRelativeTime, getStatusBadgeClass } from '@/lib/utils'
import type { Transaction } from '@/types'
import BalanceCard from '@/components/BalanceCard'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    successRate: 0,
    pendingAmount: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await api.getTransactions(10)
      setTransactions(data)

      // Calculate stats
      const totalRevenue = data
        .filter((t: Transaction) => t.status === 'succeeded')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)

      const totalTransactions = data.length
      const successfulCount = data.filter((t: Transaction) => t.status === 'succeeded').length
      const successRate = totalTransactions > 0 ? (successfulCount / totalTransactions) * 100 : 0

      const pendingAmount = data
        .filter((t: Transaction) => t.status === 'pending' || t.status === 'processing')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)

      setStats({
        totalRevenue,
        totalTransactions,
        successRate,
        pendingAmount,
      })
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Overview</h1>
        <p className="text-secondary mt-1">
          Monitor your payment performance and activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Balance Card (Replaces Pending Card) */}
        <BalanceCard />

        {/* Total Revenue */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-secondary">Total Revenue</h3>
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-semibold text-foreground">
            {formatCurrency(stats.totalRevenue, 'USD')}
          </div>
          <p className="text-sm text-success mt-2">
            +12.5% from last month
          </p>
        </div>

        {/* Total Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-secondary">Transactions</h3>
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-3xl font-semibold text-foreground">
            {stats.totalTransactions}
          </div>
          <p className="text-sm text-secondary mt-2">
            Last 100 transactions
          </p>
        </div>

        {/* Success Rate */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-secondary">Success Rate</h3>
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-semibold text-foreground">
            {stats.successRate.toFixed(1)}%
          </div>
          <p className="text-sm text-success mt-2">
            +2.4% from last month
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Recent Transactions
          </h2>
          <a
            href="/dashboard/transactions"
            className="text-sm text-accent hover:underline font-medium"
          >
            View all
          </a>
        </div>

        <div className="card p-0 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-secondary/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-secondary text-sm">No transactions yet</p>
              <p className="text-secondary text-xs mt-1">
                Create your first payment to get started
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-card transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {transaction.description || 'Payment'}
                        </div>
                        <div className="text-xs text-secondary font-mono">
                          {transaction.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        <div className="text-xs text-secondary">
                          {transaction.payment_method}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getStatusBadgeClass(transaction.status)}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">
                        {formatRelativeTime(transaction.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
