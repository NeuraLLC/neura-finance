'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Dispute,
  DisputeStatus,
  DisputeReason,
  getDisputeStatusColor,
  getDisputeStatusLabel,
  getDisputeReasonLabel,
  formatCurrency,
  getTimeUntilDeadline,
  isDisputeActionable,
} from '@/types/dispute'

export default function DisputesPage() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<DisputeStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalDisputes, setTotalDisputes] = useState(0)
  const itemsPerPage = 20

  const merchantId = typeof window !== 'undefined' ? localStorage.getItem('merchantId') || '' : ''

  useEffect(() => {
    fetchDisputes()
  }, [selectedStatus, currentPage])

  const fetchDisputes = async () => {
    if (!merchantId) return

    setLoading(true)
    setError(null)

    try {
      const filters = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      }

      const response = await api.getDisputes(merchantId, filters)

      // API wrapper unwraps the data, so response is { disputes, total }
      setDisputes(response.disputes || [])
      setTotalDisputes(response.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalDisputes / itemsPerPage)

  const getStatusBadgeClass = (status: DisputeStatus) => {
    const color = getDisputeStatusColor(status)
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium'

    switch (color) {
      case 'red':
        return `${baseClasses} bg-error/10 text-error`
      case 'yellow':
        return `${baseClasses} bg-warning/10 text-warning`
      case 'green':
        return `${baseClasses} bg-success/10 text-success`
      case 'gray':
        return `${baseClasses} bg-muted text-secondary`
      default:
        return `${baseClasses} bg-muted text-secondary`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading disputes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Disputes</h1>
        <p className="text-secondary mt-1">
          Manage and respond to payment disputes and chargebacks
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedStatus('all')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedStatus === 'all'
                ? 'bg-accent text-white'
                : 'bg-muted text-secondary hover:bg-card-hover'
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setSelectedStatus('needs_response')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedStatus === 'needs_response'
                ? 'bg-accent text-white'
                : 'bg-muted text-secondary hover:bg-card-hover'
            }`}
          >
            Needs Response
          </button>
          <button
            onClick={() => {
              setSelectedStatus('under_review')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedStatus === 'under_review'
                ? 'bg-accent text-white'
                : 'bg-muted text-secondary hover:bg-card-hover'
            }`}
          >
            Under Review
          </button>
          <button
            onClick={() => {
              setSelectedStatus('won')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedStatus === 'won'
                ? 'bg-accent text-white'
                : 'bg-muted text-secondary hover:bg-card-hover'
            }`}
          >
            Won
          </button>
          <button
            onClick={() => {
              setSelectedStatus('lost')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedStatus === 'lost'
                ? 'bg-accent text-white'
                : 'bg-muted text-secondary hover:bg-card-hover'
            }`}
          >
            Lost
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      {/* Disputes Table */}
      {disputes.length === 0 ? (
        <div className="card p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-secondary/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-foreground">No disputes</h3>
          <p className="mt-1 text-sm text-secondary">
            {selectedStatus !== 'all'
              ? `No disputes with status "${getDisputeStatusLabel(selectedStatus as DisputeStatus)}"`
              : 'You have no disputes at this time'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Dispute ID
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
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {disputes.map((dispute) => {
                  const actionable = isDisputeActionable(dispute)
                  const timeRemaining = getTimeUntilDeadline(dispute.evidence_due_by)

                  return (
                    <tr
                      key={dispute.id}
                      className="hover:bg-card transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/disputes/${dispute.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {dispute.stripe_dispute_id.substring(0, 16)}...
                        </div>
                        <div className="text-xs text-secondary font-mono">
                          {dispute.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {formatCurrency(dispute.amount, dispute.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {getDisputeReasonLabel(dispute.reason as DisputeReason)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadgeClass(dispute.status)}>
                          {getDisputeStatusLabel(dispute.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {actionable ? (
                          <span
                            className={`font-medium ${
                              timeRemaining.includes('hour') || timeRemaining.includes('Less')
                                ? 'text-error'
                                : timeRemaining.includes('1 day')
                                ? 'text-warning'
                                : 'text-foreground'
                            }`}
                          >
                            {timeRemaining}
                          </span>
                        ) : (
                          <span className="text-secondary">
                            {dispute.status === 'won' || dispute.status === 'lost'
                              ? 'Closed'
                              : 'N/A'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/disputes/${dispute.id}`)
                          }}
                          className="text-accent hover:underline font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-border">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-secondary">
                    Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium text-foreground">
                      {Math.min(currentPage * itemsPerPage, totalDisputes)}
                    </span>{' '}
                    of <span className="font-medium text-foreground">{totalDisputes}</span> disputes
                  </p>
                </div>
                <div>
                  <nav className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
