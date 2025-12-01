'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Checking account status...')

  useEffect(() => {
    initiateOnboarding()
  }, [])

  const initiateOnboarding = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')
      const accessToken = localStorage.getItem('accessToken')

      if (!merchantId || !accessToken) {
        router.push('/')
        return
      }

      setStatus('Loading merchant data...')

      // 1. Check if account already exists
      const merchantResponse = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!merchantResponse.ok) {
        throw new Error('Failed to load merchant data')
      }

      const merchantData = await merchantResponse.json()

      // 2. If onboarding already complete, redirect to dashboard
      if (merchantData.stripe_onboarding_complete) {
        router.push('/dashboard')
        return
      }

      // 3. If no Stripe account, create one
      if (!merchantData.stripe_account_id) {
        setStatus('Creating your payout account...')
        const createResponse = await fetch(`${API_URL}/stripe-connect/custom/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: merchantData.business_email,
            country: 'US', // Default to US
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create Stripe account')
        }
      }

      // 4. Get Account Link (Hosted Onboarding)
      setStatus('Redirecting to account setup...')
      const linkResponse = await fetch(`${API_URL}/stripe-connect/account-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: 'account_onboarding',
        }),
      })

      if (!linkResponse.ok) {
        throw new Error('Failed to generate onboarding link')
      }

      const { data } = await linkResponse.json()

      // 5. Redirect to Stripe
      window.location.href = data.url
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to start onboarding')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">Neura Finance</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="card text-center py-12">
          {error ? (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Setup Failed
              </h3>
              <p className="text-secondary mb-6">
                {error}
              </p>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="btn-primary"
              >
                Back to Settings
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Setting up your account
              </h3>
              <p className="text-secondary">
                {status}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
