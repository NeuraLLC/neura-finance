'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          throw new Error('No session found')
        }

        // Send the Supabase session to our backend to create/link merchant account
        const response = await fetch(`${API_URL}/auth/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            user: session.user,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'OAuth callback failed')
        }

        // Store JWT token and merchant info
        localStorage.setItem('accessToken', data.access_token)
        localStorage.setItem('merchantId', data.merchant.id)
        localStorage.setItem('businessName', data.merchant.business_name)
        localStorage.setItem('businessEmail', data.merchant.business_email)

        // Check if this is a new user or returning user
        // New OAuth users get status 'active', existing users would have onboarding completed
        const isNewUser = data.merchant.status === 'active' && !data.merchant.stripe_onboarding_complete

        if (isNewUser) {
          localStorage.setItem('isNewUser', 'true')
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err)
        setError(err.message || 'Authentication failed')

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium mb-1">Authentication Failed</p>
            <p className="text-sm">{error}</p>
          </div>
          <p className="text-secondary text-sm">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
        <p className="text-foreground">Completing authentication...</p>
        <p className="text-secondary text-sm mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  )
}
