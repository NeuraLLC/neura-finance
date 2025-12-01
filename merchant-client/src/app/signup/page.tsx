'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    business_name: '',
    business_email: '',
    password: '',
    confirmPassword: '',
    business_type: 'other',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: formData.business_name,
          business_email: formData.business_email,
          password: formData.password,
          business_type: formData.business_type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed')
      }

      // Store JWT token and merchant info
      localStorage.setItem('accessToken', data.access_token)
      localStorage.setItem('merchantId', data.merchant.id)
      localStorage.setItem('businessName', data.merchant.business_name)
      localStorage.setItem('businessEmail', data.merchant.business_email)

      // Store API key for future reference (shown only once)
      if (data.merchant.api_key) {
        localStorage.setItem('apiKey', data.merchant.api_key)
      }

      // Mark as new user for onboarding
      localStorage.setItem('isNewUser', 'true')

      // Redirect to onboarding for new users
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      setError('Failed to sign up with Google')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-12">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Neura Finance
          </h1>
        </div>

        {/* Signup Form */}
        <div>
          <h2 className="text-3xl font-semibold text-foreground mb-2">
            Create your account
          </h2>
          <p className="text-secondary text-sm mb-8">
            Start accepting payments in minutes
          </p>

          {error && (
            <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <input
                id="business_name"
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="input"
                placeholder="Business name"
                required
              />
            </div>

            <div>
              <input
                id="business_email"
                type="email"
                value={formData.business_email}
                onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                className="input"
                placeholder="Business email"
                required
              />
            </div>

            <div>
              <select
                id="business_type"
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="input"
              >
                <option value="ecommerce">E-commerce</option>
                <option value="saas">SaaS</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
                <option value="nonprofit">Non-profit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                placeholder="Password (at least 8 characters)"
                required
                minLength={8}
              />
            </div>

            <div>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="input"
                placeholder="Confirm password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Continue'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-secondary">or</span>
              </div>
            </div>
          </div>

          {/* Social Signup */}
          <div className="mt-6">
            <button onClick={handleGoogleSignUp} className="btn-social w-full">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Sign in link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-secondary">
              Already have an account?
            </p>
            <Link href="/" className="block mt-4">
              <button className="btn-secondary w-full">
                Sign in
              </button>
            </Link>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-12 text-center text-xs text-secondary">
          <p>
            By creating an account, you agree to our{' '}
            <Link href="#" className="text-accent hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-accent hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
