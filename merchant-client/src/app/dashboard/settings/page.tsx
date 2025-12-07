'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface StripeConnectStatus {
  connected: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  }
  account_type?: string
  country?: string
}

interface MerchantSettings {
  webhook_url?: string
  webhook_secret?: string
  environment?: 'sandbox' | 'production'
  sandbox_api_key?: string
  production_api_key?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')

      // Load Stripe status
      const status = await api.getStripeConnectStatus()
      setStripeStatus(status)

      // Load merchant settings
      const response = await fetch(`${API_URL}/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const merchant = data.data.merchant
        setWebhookUrl(merchant.webhook_url || '')
        setWebhookSecret(merchant.webhook_secret || '')
        setEnvironment(merchant.environment || 'sandbox')
      }

      // Load API credentials (includes secret)
      const credentialsResponse = await fetch(`${API_URL}/merchants/${merchantId}/credentials`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (credentialsResponse.ok) {
        const credData = await credentialsResponse.json()
        const credentials = credData.data

        // Set API key and secret based on environment
        if (credentials.environment === 'production') {
          setApiKey(credentials.api_key || '')
        } else {
          setApiKey(credentials.sandbox_api_key || credentials.api_key || '')
        }

        setApiSecret(credentials.api_secret || localStorage.getItem('apiSecret') || '')
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnvironmentSwitch = async (newEnv: 'sandbox' | 'production') => {
    try {
      setSaving(true)
      setError('')

      const merchantId = localStorage.getItem('merchantId')
      const response = await fetch(`${API_URL}/merchants/${merchantId}/environment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ environment: newEnv }),
      })

      if (response.ok) {
        const result = await response.json()
        setEnvironment(newEnv)
        setApiKey(newEnv === 'production' ? result.data.production_api_key : result.data.sandbox_api_key)
        setSuccess('Environment switched successfully')
        setTimeout(() => setSuccess(''), 3000)

        // Reload credentials to ensure we have the latest data
        loadSettings()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to switch environment')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to switch environment')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWebhook = async () => {
    try {
      setSaving(true)
      setError('')

      // Validate webhook URL
      if (webhookUrl && !webhookUrl.startsWith('https://')) {
        setError('Webhook URL must use HTTPS')
        setSaving(false)
        return
      }

      const merchantId = localStorage.getItem('merchantId')
      const response = await fetch(`${API_URL}/merchants/${merchantId}/webhook`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      })

      if (response.ok) {
        const data = await response.json()
        setWebhookSecret(data.webhook_secret)
        setSuccess('Webhook URL saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error('Failed to save webhook URL')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save webhook URL')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      setSaving(true)
      const response = await fetch(`${API_URL}/stripe-connect/account-link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success && data.data.url) {
        window.location.href = data.data.url
      } else {
        throw new Error('Failed to generate verification link')
      }
    } catch (error) {
      console.error('Failed to start verification:', error)
      setError('Failed to start verification process. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDashboard = async () => {
    try {
      const { url } = await api.getStripeDashboardUrl()
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to get dashboard URL:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-secondary mt-1">
          Manage your account settings and integrations
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      {/* Environment Switcher */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Environment
            </h2>
            <p className="text-sm text-secondary">
              {environment === 'sandbox'
                ? 'Test mode - No real charges will be made'
                : 'Live mode - Real charges will be processed'}
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => handleEnvironmentSwitch(environment === 'sandbox' ? 'production' : 'sandbox')}
            disabled={saving}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              environment === 'production'
                ? 'bg-success focus:ring-success'
                : 'bg-accent focus:ring-accent'
            } disabled:opacity-50`}
            role="switch"
            aria-checked={environment === 'production'}
          >
            <span className="sr-only">Toggle environment</span>
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                environment === 'production' ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Environment Indicator */}
        <div className={`p-4 rounded-xl border-2 ${
          environment === 'sandbox'
            ? 'bg-accent/5 border-accent/20'
            : 'bg-success/5 border-success/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              environment === 'sandbox'
                ? 'bg-accent/10'
                : 'bg-success/10'
            }`}>
              <svg className={`w-5 h-5 ${
                environment === 'sandbox' ? 'text-accent' : 'text-success'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {environment === 'sandbox' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                )}
              </svg>
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${
                environment === 'sandbox' ? 'text-accent' : 'text-success'
              }`}>
                {environment === 'sandbox' ? 'Test Mode Active' : 'Live Mode Active'}
              </h3>
              <p className="text-sm text-secondary mt-0.5">
                {environment === 'sandbox'
                  ? 'Use test card 4242 4242 4242 4242 with any future expiry and CVC'
                  : 'All transactions will process real payments and affect your balance'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Credentials Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          API Credentials
        </h2>
        <p className="text-sm text-secondary mb-6">
          Use these credentials for {environment === 'sandbox' ? 'testing' : 'production'} integrations
        </p>

        {/* Security Warning */}
        <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-semibold text-warning mb-1">Keep your credentials secure</h4>
              <p className="text-sm text-secondary">
                Never share your API secret publicly or commit it to version control.
                Anyone with your secret can make authenticated requests on your behalf.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                API Key
              </label>
              <span className={`badge text-xs ${environment === 'sandbox' ? 'badge-secondary' : 'bg-success/10 text-success'}`}>
                {environment.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey}
                readOnly
                className="input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiKey)
                  setSuccess('API key copied to clipboard')
                  setTimeout(() => setSuccess(''), 2000)
                }}
                className="btn-secondary"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-secondary mt-1">
              Include this in the <code className="px-1 py-0.5 bg-muted rounded text-xs">X-API-Key</code> header
            </p>
          </div>

          {/* API Secret */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                API Secret
              </label>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="text-xs text-accent hover:underline"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                readOnly
                className="input flex-1 font-mono text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiSecret)
                  setSuccess('API secret copied to clipboard')
                  setTimeout(() => setSuccess(''), 2000)
                }}
                className="btn-secondary"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-secondary mt-1">
              Use this to sign requests with HMAC-SHA256. See{' '}
              <a
                href="https://docs.neurafinance.com/authentication"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                authentication docs
              </a>
            </p>
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-6 p-4 bg-muted/30 rounded-xl">
          <h4 className="text-sm font-semibold text-foreground mb-2">Quick Start Example</h4>
          <pre className="text-xs text-secondary overflow-x-auto">
{`// Node.js example
const crypto = require('crypto');

const timestamp = Math.floor(Date.now() / 1000).toString();
const payload = JSON.stringify({ amount: 10000 });
const signature = crypto
  .createHmac('sha256', 'your_secret'}')
  .update(\`\${timestamp}.\${payload}\`)
  .digest('hex');

fetch('https://api.neurafinance.com/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': '${apiKey ? apiKey.slice(0, 20) + '...' : 'your_key'}',
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  },
  body: payload
});`}
          </pre>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Webhook Configuration
        </h2>
        <p className="text-sm text-secondary mb-6">
          Receive real-time payment notifications at your endpoint
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/webhooks/neurapay"
              className="input"
            />
            <p className="text-xs text-secondary mt-1">
              Must be a publicly accessible HTTPS endpoint
            </p>
          </div>

          {webhookSecret && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Webhook Secret
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookSecret}
                  readOnly
                  className="input flex-1 font-mono text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookSecret)
                    setSuccess('Webhook secret copied')
                    setTimeout(() => setSuccess(''), 2000)
                  }}
                  className="btn-secondary"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-secondary mt-1">
                Use this secret to verify webhook signatures
              </p>
            </div>
          )}

          <button
            onClick={handleSaveWebhook}
            disabled={saving || !webhookUrl}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Webhook URL'}
          </button>
        </div>

        {/* Webhook Events */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Webhook Events
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'payment.succeeded',
              'payment.failed',
              'payment.pending',
              'refund.created',
              'refund.succeeded',
              'refund.failed',
            ].map((event) => (
              <div key={event} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <code className="text-secondary">{event}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payout Account Section */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Payout Account
            </h2>
            <p className="text-sm text-secondary">
              Setup your account verification to receive payouts
            </p>
          </div>
          {stripeStatus?.connected && (
            <span className="badge-success">
              {stripeStatus.charges_enabled && stripeStatus.payouts_enabled ? 'Verified' : 'Pending'}
            </span>
          )}
        </div>

        {!stripeStatus?.connected ? (
          /* Not Connected */
          <div className="text-center py-8">
            <svg
              className="w-16 h-16 mx-auto text-secondary/30 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Complete Account Verification
            </h3>
            <p className="text-secondary text-sm mb-6 max-w-md mx-auto">
              To receive payouts from your customers, you'll need to complete account verification.
              This is a one-time process that takes about 5 minutes.
            </p>
            <button onClick={handleConnectStripe} className="btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Complete Verification
            </button>
          </div>
        ) : (
          /* Connected */
          <div className="space-y-4">
            {/* Verification Status */}
            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                {stripeStatus.charges_enabled && stripeStatus.payouts_enabled ? (
                  <>
                    <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Account Verified</h3>
                      <p className="text-sm text-secondary">
                        Your account is fully verified. You can accept payments and receive payouts.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Verification In Progress</h3>
                      <p className="text-sm text-secondary mb-3">
                        Complete your account verification to start receiving payouts.
                      </p>
                      <button onClick={handleConnectStripe} className="btn-primary text-sm">
                        Complete Verification
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Capabilities Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-secondary">Accept Payments</span>
                  {stripeStatus.charges_enabled ? (
                    <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <p className={`text-lg font-semibold ${stripeStatus.charges_enabled ? 'text-success' : 'text-error'}`}>
                  {stripeStatus.charges_enabled ? 'Active' : 'Inactive'}
                </p>
              </div>

              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-secondary">Receive Payouts</span>
                  {stripeStatus.payouts_enabled ? (
                    <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <p className={`text-lg font-semibold ${stripeStatus.payouts_enabled ? 'text-success' : 'text-error'}`}>
                  {stripeStatus.payouts_enabled ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            {/* Account Management */}
            {/* <div className="pt-4">
              <button onClick={handleOpenDashboard} className="btn-secondary w-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Payout Settings
              </button>
            </div> */}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {/* <div className="card border-error/20">
        <h2 className="text-xl font-semibold text-error mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-secondary mb-6">
          Irreversible and destructive actions
        </p>

        <div className="space-y-3">
          <button className="btn-secondary w-full text-error border-error/20 hover:bg-error/10">
            Disconnect Stripe Account
          </button>
          <button className="btn-secondary w-full text-error border-error/20 hover:bg-error/10">
            Deactivate Account
          </button>
        </div>
      </div> */}
    </div>
  )
}
