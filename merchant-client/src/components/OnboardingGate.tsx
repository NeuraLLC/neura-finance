'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null)
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

      const response = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success && data.data.merchant.stripe_onboarding_complete) {
        setIsOnboarded(true)
      } else {
        setIsOnboarded(false)
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
      setIsOnboarded(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    setLoading(true)
    try {
      const merchantId = localStorage.getItem('merchantId')
      const accessToken = localStorage.getItem('accessToken')

      if (!merchantId || !accessToken) {
        router.push('/')
        return
      }

      const response = await fetch(`${API_URL}/stripe-connect/account-link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success && data.data.url) {
        window.location.href = data.data.url
      } else {
        throw new Error('Failed to generate onboarding link')
      }
    } catch (error) {
      console.error('Failed to start onboarding:', error)
      alert('Failed to start verification process. Please try again.')
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  if (isOnboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-accent/10">
            <svg className="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isOnboarded) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header with logout */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-xl font-semibold text-foreground">Neura Finance</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-secondary hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-lg text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-accent/10">
              <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-foreground mb-4">Complete Account Verification</h1>
            <p className="text-secondary text-lg mb-8">
              Before you can start accepting payments, you need to complete your account verification.
              This is a one-time process that takes about 5 minutes.
            </p>
            <button
              onClick={handleCompleteOnboarding}
              disabled={loading}
              className="btn-primary w-full max-w-xs mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Complete Verification Now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
