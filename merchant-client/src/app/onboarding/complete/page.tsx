'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OnboardingComplete() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'success' | 'incomplete'>('checking')

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')
      const accessToken = localStorage.getItem('accessToken')

      if (!merchantId || !accessToken) {
        setStatus('incomplete')
        return
      }

      const response = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success && data.data.merchant.stripe_onboarding_complete) {
        setStatus('success')
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setStatus('incomplete')
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
      setStatus('incomplete')
    }
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-accent/10">
            <svg className="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Verifying your account</h1>
          <p className="text-secondary">Please wait while we confirm your details...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-success/10">
            <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-3">Account Verified!</h1>
          <p className="text-secondary text-lg mb-6">
            Your account has been successfully verified.
          </p>
          <p className="text-sm text-secondary">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-warning/10">
          <svg className="w-10 h-10 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-3">Verification Incomplete</h1>
        <p className="text-secondary mb-8">
          You need to complete all required information to verify your account. You can continue the verification process from your dashboard settings.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-primary w-full"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}
