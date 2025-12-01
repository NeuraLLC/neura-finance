'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface VerificationStatusData {
  status: string
  sessionId?: string
  verifiedAt?: string
  canRetry: boolean
}

export default function VerificationStatus() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<VerificationStatusData | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/stripe-connect/verification/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data.data)
      }
    } catch (err) {
      setError('Failed to fetch verification status')
    } finally {
      setLoading(false)
    }
  }

  const handleStartVerification = async () => {
    setCreating(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/stripe-connect/verification/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe Identity page
        window.location.href = data.data.url
      } else {
        setError('Failed to create verification session')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ✓ Verified
          </span>
        )
      case 'requires_input':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            ⚠ Action Required
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            ○ Pending
          </span>
        )
      case 'canceled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            ✕ Canceled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Your identity has been verified. You can start accepting payments.'
      case 'requires_input':
        return 'Additional documents are required to complete your verification. Please upload the requested documents.'
      case 'pending':
        return 'Start the identity verification process to activate your account.'
      case 'canceled':
        return 'Your verification was canceled. You can start a new verification session.'
      default:
        return 'Unknown verification status.'
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-card-hover rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-card-hover rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!status) {
    return null
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Identity Verification</h3>
          <p className="text-sm text-secondary">
            {getStatusMessage(status.status)}
          </p>
        </div>
        {getStatusBadge(status.status)}
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm mb-4">
          {error}
        </div>
      )}

      {status.verifiedAt && (
        <p className="text-xs text-secondary mb-4">
          Verified on {new Date(status.verifiedAt).toLocaleDateString()}
        </p>
      )}

      {status.canRetry && (
        <button
          onClick={handleStartVerification}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? 'Creating session...' : status.status === 'requires_input' ? 'Upload Documents' : 'Start Verification'}
        </button>
      )}
    </div>
  )
}
