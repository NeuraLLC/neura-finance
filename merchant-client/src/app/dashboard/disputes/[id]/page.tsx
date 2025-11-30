'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Dispute,
  DisputeEvidence,
  SubmitEvidenceData,
  getDisputeStatusColor,
  getDisputeStatusLabel,
  getDisputeReasonLabel,
  formatCurrency,
  getTimeUntilDeadline,
  isDisputeActionable,
} from '@/types/dispute'
import FileUpload from '@/components/FileUpload'

export default function DisputeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const disputeId = params?.id as string

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [evidence, setEvidence] = useState<DisputeEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Evidence form state
  const [evidenceForm, setEvidenceForm] = useState<Partial<SubmitEvidenceData>>({
    customer_name: '',
    customer_email_address: '',
    customer_purchase_ip: '',
    product_description: '',
    shipping_tracking_number: '',
    shipping_carrier: '',
    customer_communication: '',
    uncategorized_text: '',
  })

  // Merchant notes state
  const [notes, setNotes] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)

  // File upload state
  const [selectedEvidenceType, setSelectedEvidenceType] = useState('receipt')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (disputeId) {
      fetchDisputeDetails()
    }
  }, [disputeId])

  const fetchDisputeDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const [disputeResponse, evidenceResponse] = await Promise.all([
        api.getDispute(disputeId),
        api.getDisputeEvidence(disputeId),
      ])

      if (disputeResponse.success) {
        setDispute(disputeResponse.data)
        setNotes(disputeResponse.data.merchant_notes || '')
      }

      if (evidenceResponse.success) {
        setEvidence(evidenceResponse.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dispute details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispute) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await api.submitEvidence(disputeId, evidenceForm)

      if (response.success) {
        setSuccessMessage('Evidence submitted successfully!')
        fetchDisputeDetails() // Refresh dispute data
        // Clear form
        setEvidenceForm({
          customer_name: '',
          customer_email_address: '',
          customer_purchase_ip: '',
          product_description: '',
          shipping_tracking_number: '',
          shipping_carrier: '',
          customer_communication: '',
          uncategorized_text: '',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit evidence')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptDispute = async () => {
    if (!dispute) return
    if (!confirm('Are you sure you want to accept this dispute? This action cannot be undone.')) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await api.acceptDispute(disputeId)

      if (response.success) {
        setSuccessMessage('Dispute accepted successfully')
        fetchDisputeDetails()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept dispute')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!dispute) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await api.updateDisputeNotes(disputeId, notes)

      if (response.success) {
        setSuccessMessage('Notes saved successfully')
        setNotesEditing(false)
        fetchDisputeDetails()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save notes')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUploadComplete = (files: any[]) => {
    setUploadSuccess(true)
    setSuccessMessage(`${files.length} file(s) uploaded successfully!`)
    fetchDisputeDetails() // Refresh evidence list

    // Clear success message after 5 seconds
    setTimeout(() => {
      setUploadSuccess(false)
      setSuccessMessage(null)
    }, 5000)
  }

  const handleFileUploadError = (errorMessage: string) => {
    setError(errorMessage)
    setTimeout(() => setError(null), 5000)
  }

  const getStatusBadgeClass = (status: string) => {
    const color = getDisputeStatusColor(status as any)
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium inline-block'

    switch (color) {
      case 'red':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'yellow':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'green':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'gray':
        return `${baseClasses} bg-gray-100 text-gray-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Dispute not found</h2>
          <button
            onClick={() => router.push('/dashboard/disputes')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to disputes
          </button>
        </div>
      </div>
    )
  }

  const actionable = isDisputeActionable(dispute)
  const timeRemaining = getTimeUntilDeadline(dispute.evidence_due_by)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/disputes')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Disputes
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dispute Details</h1>
              <p className="mt-1 text-sm text-gray-600">ID: {dispute.stripe_dispute_id}</p>
            </div>
            <span className={getStatusBadgeClass(dispute.status)}>
              {getDisputeStatusLabel(dispute.status)}
            </span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Actionable Alert */}
        {actionable && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-yellow-400 mt-0.5"
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
                <h3 className="text-sm font-medium text-yellow-800">Action Required</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  This dispute requires a response. <strong>{timeRemaining}</strong> to submit evidence.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dispute Information</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Amount</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(dispute.amount, dispute.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reason</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {getDisputeReasonLabel(dispute.reason as any)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(dispute.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Evidence Due By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(dispute.evidence_due_by).toLocaleString()}
                  </dd>
                </div>
                {dispute.network_reason_code && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Network Reason Code</dt>
                    <dd className="mt-1 text-sm text-gray-900">{dispute.network_reason_code}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Evidence Submitted</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dispute.evidence_submitted ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Evidence Submission Form */}
            {actionable && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Evidence</h2>
                <form onSubmit={handleSubmitEvidence} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                      <input
                        type="text"
                        value={evidenceForm.customer_name || ''}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, customer_name: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Email</label>
                      <input
                        type="email"
                        value={evidenceForm.customer_email_address || ''}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, customer_email_address: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer IP Address</label>
                      <input
                        type="text"
                        value={evidenceForm.customer_purchase_ip || ''}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, customer_purchase_ip: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={evidenceForm.shipping_tracking_number || ''}
                        onChange={(e) =>
                          setEvidenceForm({
                            ...evidenceForm,
                            shipping_tracking_number: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Product Description
                      </label>
                      <textarea
                        rows={3}
                        value={evidenceForm.product_description || ''}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, product_description: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Customer Communication
                      </label>
                      <textarea
                        rows={4}
                        value={evidenceForm.customer_communication || ''}
                        onChange={(e) =>
                          setEvidenceForm({
                            ...evidenceForm,
                            customer_communication: e.target.value,
                          })
                        }
                        placeholder="Paste email threads, chat logs, or other communication showing customer acknowledgment"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Additional Information
                      </label>
                      <textarea
                        rows={4}
                        value={evidenceForm.uncategorized_text || ''}
                        onChange={(e) =>
                          setEvidenceForm({ ...evidenceForm, uncategorized_text: e.target.value })
                        }
                        placeholder="Any other relevant information"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit Evidence'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* File Upload Section */}
            {actionable && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Evidence Files</h2>

                {/* Evidence Type Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidence Type
                  </label>
                  <select
                    value={selectedEvidenceType}
                    onChange={(e) => setSelectedEvidenceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="receipt">Receipt / Invoice</option>
                    <option value="customer_communication">Customer Communication</option>
                    <option value="shipping_documentation">Shipping Documentation</option>
                    <option value="refund_policy">Refund Policy</option>
                    <option value="billing_agreement">Billing Agreement</option>
                    <option value="cancellation_policy">Cancellation Policy</option>
                    <option value="customer_signature">Customer Signature</option>
                    <option value="service_documentation">Service Documentation</option>
                    <option value="duplicate_charge_documentation">Duplicate Charge Documentation</option>
                    <option value="uncategorized">Other Evidence</option>
                  </select>
                </div>

                <FileUpload
                  disputeId={disputeId}
                  merchantId={dispute.merchant_id}
                  evidenceType={selectedEvidenceType}
                  description={`Evidence for ${getDisputeReasonLabel(dispute.reason as any)}`}
                  onUploadComplete={handleFileUploadComplete}
                  onUploadError={handleFileUploadError}
                  maxFiles={5}
                />

                {uploadSuccess && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">Files uploaded and submitted to Stripe successfully!</p>
                  </div>
                )}
              </div>
            )}

            {/* Evidence Files */}
            {evidence.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Evidence</h2>
                <div className="space-y-3">
                  {evidence.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.file_name || 'Unnamed file'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.evidence_type} • Uploaded{' '}
                            {new Date(file.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {actionable && (
                  <>
                    <button
                      onClick={handleAcceptDispute}
                      disabled={submitting}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Accept Dispute
                    </button>
                    <p className="text-xs text-gray-500">
                      Accepting the dispute means you agree with the customer's claim and the funds will be
                      returned to them.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Merchant Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Merchant Notes</h2>
                {!notesEditing && (
                  <button
                    onClick={() => setNotesEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
              </div>
              {notesEditing ? (
                <div>
                  <textarea
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                    placeholder="Add internal notes about this dispute..."
                  />
                  <div className="mt-3 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setNotesEditing(false)
                        setNotes(dispute.merchant_notes || '')
                      }}
                      className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={submitting}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {notes || 'No notes added yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
