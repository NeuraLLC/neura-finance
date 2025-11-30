'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  action?: () => void
  actionLabel?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<any>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'account',
      title: 'Account Created',
      description: 'Your NeuraPay account is ready to go',
      completed: true,
    },
    {
      id: 'stripe',
      title: 'Connect Stripe Account',
      description: 'Link your Stripe account to start accepting payments',
      completed: false,
      actionLabel: 'Connect Stripe',
    },
    {
      id: 'api',
      title: 'Get API Credentials',
      description: 'Copy your API keys for integration',
      completed: false,
      actionLabel: 'View API Keys',
    },
    {
      id: 'payment',
      title: 'Create Payment Link',
      description: 'Test your setup with a payment link',
      completed: false,
      actionLabel: 'Create Link',
    },
  ])

  useEffect(() => {
    loadMerchantData()
  }, [])

  const loadMerchantData = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')
      if (!merchantId) {
        router.push('/')
        return
      }

      // Fetch merchant details
      const response = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMerchant(data)
        setApiKey(data.api_key || '')

        // Update steps based on merchant data
        setSteps(prev => prev.map(step => {
          if (step.id === 'stripe' && data.stripe_onboarding_complete) {
            return { ...step, completed: true }
          }
          if (step.id === 'api' && data.api_key) {
            return { ...step, completed: true }
          }
          return step
        }))
      }
    } catch (error) {
      console.error('Failed to load merchant data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStripeConnect = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')
      const response = await fetch(`${API_URL}/stripe-connect/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ merchant_id: merchantId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to start Stripe Connect:', error)
    }
  }

  const handleViewApiKeys = () => {
    router.push('/dashboard/settings')
  }

  const handleCreatePaymentLink = () => {
    router.push('/dashboard/payment-links')
  }

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    router.push('/dashboard')
  }

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    router.push('/dashboard')
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const completedSteps = steps.filter(s => s.completed).length
  const progress = (completedSteps / steps.length) * 100

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">NeuraPay</h1>
          <button
            onClick={handleSkip}
            className="text-sm text-secondary hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-semibold text-foreground mb-2">
            Welcome to NeuraPay!
          </h2>
          <p className="text-secondary max-w-2xl mx-auto">
            Let's get you set up to start accepting payments. Complete these steps to activate your account.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Setup Progress
            </span>
            <span className="text-sm text-secondary">
              {completedSteps} of {steps.length} completed
            </span>
          </div>
          <div className="w-full h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`card ${step.completed ? 'border-accent/50' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Step Number/Check */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.completed
                      ? 'bg-accent text-white'
                      : 'bg-card-hover text-secondary'
                  }`}
                >
                  {step.completed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-secondary mb-3">
                    {step.description}
                  </p>

                  {/* Step-specific content */}
                  {step.id === 'api' && apiKey && (
                    <div className="mb-3 p-3 bg-input rounded-xl border border-input-border">
                      <div className="flex items-center justify-between">
                        <code className="text-sm text-foreground font-mono">
                          {apiKey}
                        </code>
                        <button
                          onClick={copyApiKey}
                          className="text-xs text-accent hover:text-accent/80 ml-2"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {!step.completed && step.actionLabel && (
                    <button
                      onClick={
                        step.id === 'stripe' ? handleStripeConnect :
                        step.id === 'api' ? handleViewApiKeys :
                        step.id === 'payment' ? handleCreatePaymentLink :
                        undefined
                      }
                      className="btn-primary"
                    >
                      {step.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Complete Button */}
        {progress === 100 ? (
          <div className="text-center">
            <button onClick={handleComplete} className="btn-primary btn-lg">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-secondary">
              You can complete these steps later from your dashboard
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
