'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface BannerVariant {
  type: 'info' | 'warning' | 'urgent'
  icon: string
  title: string
  message: string
  bgColor: string
  borderColor: string
  iconBgColor: string
}

export default function OnboardingBanner() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [merchant, setMerchant] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [variant, setVariant] = useState<BannerVariant | null>(null)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
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

        // Don't show banner if onboarding is complete
        if (data.stripe_onboarding_complete) {
          return
        }

        // Don't show banner if deferred onboarding is not enabled
        if (!data.deferred_onboarding_enabled) {
          return
        }

        // Calculate days since first payment
        let daysRemaining = null
        let daysSinceFirstPayment = 0
        if (data.first_payment_at) {
          const firstPaymentDate = new Date(data.first_payment_at)
          daysSinceFirstPayment = Math.floor((Date.now() - firstPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
          daysRemaining = 30 - daysSinceFirstPayment
        }

        const earningsCount = data.earnings_count || 0

        // Determine banner variant based on urgency
        let bannerVariant: BannerVariant

        if (daysRemaining !== null && daysRemaining <= 1) {
          // Urgent: 1 day or less remaining
          bannerVariant = {
            type: 'urgent',
            icon: 'alert',
            title: 'Action Required: Complete Verification Now',
            message: `You have ${daysRemaining === 0 ? 'less than 24 hours' : '1 day'} left to complete account verification. After the deadline, you won't be able to process new payments until verification is complete.`,
            bgColor: 'bg-destructive/10',
            borderColor: 'border-destructive/30',
            iconBgColor: 'bg-destructive',
          }
          setShow(true)
        } else if (daysRemaining !== null && daysRemaining <= 7) {
          // Warning: 7 days or less remaining
          bannerVariant = {
            type: 'warning',
            icon: 'alert',
            title: 'Verification Deadline Approaching',
            message: `Complete your account verification within ${daysRemaining} days to continue processing payments. You have ${earningsCount} pending payment${earningsCount !== 1 ? 's' : ''} waiting to be transferred.`,
            bgColor: 'bg-warning/10',
            borderColor: 'border-warning/30',
            iconBgColor: 'bg-warning',
          }
          setShow(true)
        } else if (earningsCount >= 3) {
          // Info: 3+ payments received, show gentle reminder
          const wasDismissed = localStorage.getItem('onboardingBannerDismissed')
          if (wasDismissed) {
            setDismissed(true)
            return
          }

          bannerVariant = {
            type: 'info',
            icon: 'info',
            title: 'Complete Account Setup',
            message: `You've received ${earningsCount} payment${earningsCount !== 1 ? 's' : ''}! Complete verification to receive your payouts${daysRemaining !== null ? `. ${daysRemaining} days remaining` : ''}.`,
            bgColor: 'bg-accent/10',
            borderColor: 'border-accent/20',
            iconBgColor: 'bg-accent',
          }
          setShow(true)
        } else {
          // Don't show banner if less than 3 payments
          return
        }

        setVariant(bannerVariant)
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error)
    }
  }

  const handleDismiss = () => {
    // Only allow dismissing for info banners, not warnings or urgent
    if (variant?.type === 'info') {
      localStorage.setItem('onboardingBannerDismissed', 'true')
      setShow(false)
    }
  }

  const handleComplete = () => {
    router.push('/onboarding')
  }

  if (!show || dismissed || !variant) return null

  return (
    <div className={`${variant.bgColor} border ${variant.borderColor} rounded-xl p-4 mb-6`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 ${variant.iconBgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
          {variant.icon === 'alert' ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {variant.title}
          </h3>
          <p className="text-sm text-secondary mb-3">
            {variant.message}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={handleComplete} className="btn-primary text-sm">
              Complete Verification
            </button>
            {variant.type === 'info' && (
              <button
                onClick={handleDismiss}
                className="text-sm text-secondary hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Close Button (only for info banners) */}
        {variant.type === 'info' && (
          <button
            onClick={handleDismiss}
            className="text-secondary hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
