'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Checking account status...')
  const [showOptions, setShowOptions] = useState(true)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')
      const accessToken = localStorage.getItem('accessToken')

      if (!merchantId || !accessToken) {
        router.push('/')
        return
      }

      const merchantResponse = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!merchantResponse.ok) {
        throw new Error('Failed to load merchant data')
      }

      const merchantData = await merchantResponse.json()

      // If onboarding already complete, redirect to dashboard
      if (merchantData.stripe_onboarding_complete) {
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error('Error checking onboarding status:', err)
    }
  }

  const initiateOnboarding = async () => {
    try {
      setShowOptions(false)
      setLoading(true)
      const merchantId = localStorage.getItem('merchantId')
      const accessToken = localStorage.getItem('accessToken')

      if (!merchantId || !accessToken) {
        router.push('/')
        return
      }

      setStatus('Redirecting to account setup...')

      // Get Account Link (Hosted Onboarding)
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

      // Redirect to Stripe
      window.location.href = data.url
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to start onboarding')
      setLoading(false)
      setShowOptions(true)
    }
  }

  const skipOnboarding = () => {
    router.push('/dashboard')
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
        <div className="card py-12">
          {error ? (
            <div className="text-center">
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
              <div className="flex gap-3 justify-center">
                <button
                  onClick={skipOnboarding}
                  className="btn-secondary"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={initiateOnboarding}
                  className="btn-primary"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center">
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
            </div>
          ) : showOptions ? (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  Complete Account Setup
                </h3>
                <p className="text-secondary text-base mb-2">
                  To receive payouts, you'll need to complete your Stripe account verification.
                </p>
                <p className="text-secondary text-sm">
                  You can skip this for now and start processing payments. You'll have 30 days to complete verification.
                </p>
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-3">What you'll need:</h4>
                <ul className="space-y-2 text-sm text-secondary">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Business information and tax ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Bank account details for payouts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Personal identification (for verification)</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={skipOnboarding}
                  className="btn-secondary flex-1"
                >
                  Skip for now
                </button>
                <button
                  onClick={initiateOnboarding}
                  className="btn-primary flex-1"
                >
                  Complete Setup
                </button>
              </div>

              <p className="text-xs text-secondary text-center mt-6">
                You can complete this setup later from your Settings page
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
