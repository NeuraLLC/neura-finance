'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { DisputeStats, formatCurrency } from '@/types/dispute'

interface DisputeStatsWidgetProps {
  merchantId: string
}

export default function DisputeStatsWidget({ merchantId }: DisputeStatsWidgetProps) {
  const router = useRouter()
  const [stats, setStats] = useState<DisputeStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (merchantId) {
      fetchStats()
    }
  }, [merchantId])

  const fetchStats = async () => {
    try {
      const response = await api.getDisputeStats(merchantId)
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch dispute stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const needsAction = stats.needs_response > 0

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Disputes</h3>
          {needsAction && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              {stats.needs_response} Need Response
            </span>
          )}
        </div>

        {/* Alert for action needed */}
        {needsAction && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  You have {stats.needs_response} dispute{stats.needs_response !== 1 ? 's' : ''} that
                  require{stats.needs_response === 1 ? 's' : ''} a response
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Total Disputes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_disputes}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Win Rate</p>
            <p className="text-2xl font-bold text-green-600">{stats.win_rate}%</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Under Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.under_review}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Won</p>
            <p className="text-2xl font-bold text-green-600">{stats.won}</p>
          </div>
        </div>

        {/* Amounts */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Disputed</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(stats.total_amount_disputed, 'USD')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Lost</span>
            <span className="font-semibold text-red-600">
              {formatCurrency(stats.total_amount_lost, 'USD')}
            </span>
          </div>
        </div>

        {/* View All Button */}
        <button
          onClick={() => router.push('/dashboard/disputes')}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          View All Disputes
        </button>
      </div>
    </div>
  )
}
