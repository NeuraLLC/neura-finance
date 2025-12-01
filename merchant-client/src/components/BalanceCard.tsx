'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface BalanceData {
  available: number
  pending: number
  currency: string
}

export default function BalanceCard() {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${API_URL}/stripe-connect/balance`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBalance(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePayout = async () => {
    setPayoutLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_URL}/stripe-connect/payout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Payout initiated successfully')
        fetchBalance() // Refresh balance
      } else {
        setError(data.error?.message || 'Failed to initiate payout')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setPayoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-card-hover rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-card-hover rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-card-hover rounded w-1/4"></div>
      </div>
    )
  }

  if (!balance) return null

  return (
    <div className="card bg-gradient-to-br from-card to-card/50 border-accent/10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-secondary mb-1">Available Balance</h3>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(balance.available, balance.currency)}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-sm font-medium text-secondary mb-1">Pending</h3>
          <div className="text-lg font-semibold text-secondary">
            {formatCurrency(balance.pending, balance.currency)}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
          {success}
        </div>
      )}

      <button
        onClick={handlePayout}
        disabled={payoutLoading || balance.available <= 0}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {payoutLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <span>Payout Funds</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </>
        )}
      </button>
      
      {balance.available <= 0 && (
        <p className="text-xs text-secondary text-center mt-3">
          Minimum payout amount is {formatCurrency(100, balance.currency)}
        </p>
      )}
    </div>
  )
}
