'use client'

import { useState, useEffect } from 'react'

interface BankFormProps {
  onSubmit: (token: string) => Promise<void>
}

declare global {
  interface Window {
    Stripe?: any
  }
}

export default function BankForm({ onSubmit }: BankFormProps) {
  const [loading, setLoading] = useState(false)
  const [stripe, setStripe] = useState<any>(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    routingNumber: '',
    accountNumber: '',
    accountHolderName: '',
    accountHolderType: 'company', // For businesses
  })

  useEffect(() => {
    // Initialize Stripe when the component mounts
    if (window.Stripe) {
      const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      setStripe(stripeInstance)
    } else {
      // Wait for Stripe.js to load
      const checkStripe = setInterval(() => {
        if (window.Stripe) {
          const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
          setStripe(stripeInstance)
          clearInterval(checkStripe)
        }
      }, 100)

      return () => clearInterval(checkStripe)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!stripe) {
      setError('Stripe is not loaded yet. Please try again.')
      setLoading(false)
      return
    }

    try {
      // Create a bank account token using Stripe.js
      const result = await stripe.createToken('bank_account', {
        country: 'US',
        currency: 'usd',
        routing_number: formData.routingNumber,
        account_number: formData.accountNumber,
        account_holder_name: formData.accountHolderName,
        account_holder_type: formData.accountHolderType,
      })

      if (result.error) {
        setError(result.error.message || 'Failed to tokenize bank account')
        setLoading(false)
        return
      }

      // Send only the token to the backend
      await onSubmit(result.token.id)
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing your bank account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="accountHolderName" className="block text-sm font-medium text-foreground mb-1">
          Account Holder Name
        </label>
        <input
          id="accountHolderName"
          type="text"
          value={formData.accountHolderName}
          onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
          className="input"
          placeholder="e.g. Acme Inc."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="routingNumber" className="block text-sm font-medium text-foreground mb-1">
            Routing Number
          </label>
          <input
            id="routingNumber"
            type="text"
            value={formData.routingNumber}
            onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
            className="input"
            placeholder="9 digits"
            pattern="\d{9}"
            maxLength={9}
            required
          />
          <p className="text-xs text-secondary mt-1">Test: 110000000</p>
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-foreground mb-1">
            Account Number
          </label>
          <input
            id="accountNumber"
            type="text"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            className="input"
            placeholder="Account number"
            required
          />
          <p className="text-xs text-secondary mt-1">Test: 000123456789</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Save Bank Account'}
      </button>
    </form>
  )
}
