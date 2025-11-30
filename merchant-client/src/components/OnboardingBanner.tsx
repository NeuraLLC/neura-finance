'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OnboardingBanner() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [merchant, setMerchant] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Check if user dismissed the banner
      const wasDismissed = localStorage.getItem('onboardingBannerDismissed')
      if (wasDismissed) {
        setDismissed(true)
        return
      }

      // Check if onboarding is marked as completed
      const onboardingCompleted = localStorage.getItem('onboardingCompleted')
      if (onboardingCompleted) {
        return
      }

      const merchantId = localStorage.getItem('merchantId')
      if (!merchantId) return

      // Fetch merchant status
      const response = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMerchant(data)

        // Show banner if Stripe not connected
        if (!data.stripe_onboarding_complete) {
          setShow(true)
        }
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('onboardingBannerDismissed', 'true')
    setShow(false)
  }

  const handleComplete = () => {
    router.push('/onboarding')
  }

  if (!show || dismissed) return null

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Complete Your Setup
          </h3>
          <p className="text-sm text-secondary mb-3">
            Connect your Stripe account to start accepting payments. It only takes a few minutes.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={handleComplete} className="btn-primary text-sm">
              Complete Setup
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm text-secondary hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="text-secondary hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
