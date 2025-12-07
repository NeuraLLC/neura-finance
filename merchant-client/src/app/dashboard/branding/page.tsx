'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Branding {
  logo_url?: string | null
  primary_color?: string
  merchant_display_name?: string | null
  default_currency?: string
  payment_methods?: string[]
}

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding>({
    logo_url: null,
    primary_color: '#2563eb',
    merchant_display_name: null,
    default_currency: 'usd',
    payment_methods: ['card'],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = async () => {
    try {
      const merchantId = localStorage.getItem('merchantId')
      if (!merchantId) return

      const response = await api.getBranding(merchantId)
      setBranding(response.branding)
    } catch (err: any) {
      console.error('Failed to load branding:', err)
      setError('Failed to load branding settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const merchantId = localStorage.getItem('merchantId')
      if (!merchantId) return

      await api.updateBranding(merchantId, branding)

      setSuccess('Branding settings saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save branding settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setBranding({
      logo_url: null,
      primary_color: '#2563eb',
      merchant_display_name: null,
      default_currency: 'usd',
      payment_methods: ['card'],
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-secondary">Loading branding settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Branding</h1>
        <p className="text-secondary mt-1">
          Customize how your payment links appear to customers
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

      {/* Preview Card */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-4">Preview</h2>
        <div className="border-2 border-border rounded-xl p-8 bg-background">
          <div className="max-w-md mx-auto">
            {/* Logo */}
            {branding.logo_url ? (
              <div className="flex justify-center mb-6">
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className="h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-center mb-6">
                <div className="w-32 h-12 bg-muted rounded-lg flex items-center justify-center text-xs text-secondary">
                  Your Logo
                </div>
              </div>
            )}

            {/* Merchant Name */}
            <h3 className="text-2xl font-semibold text-center mb-2" style={{ color: branding.primary_color }}>
              {branding.merchant_display_name || 'Your Business Name'}
            </h3>

            {/* Sample Payment Info */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-secondary mb-2">Amount</p>
                  <p className="text-3xl font-semibold text-foreground">
                    {branding.default_currency?.toUpperCase() || 'USD'} 50.00
                  </p>
                </div>

                <div>
                  <p className="text-xs text-secondary mb-2">Payment Method</p>
                  <div className="flex gap-2">
                    {branding.payment_methods?.map((method) => (
                      <span key={method} className="badge-secondary capitalize">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sample Button */}
                <button
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all"
                  style={{ backgroundColor: branding.primary_color }}
                  disabled
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo URL */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">Logo</h2>
        <p className="text-sm text-secondary mb-6">
          Enter a URL to your logo image. For best results, use a transparent PNG with a 3:1 aspect ratio.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={branding.logo_url || ''}
              onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
              className="input"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-secondary mt-1">
              You can use image hosting services like Imgur, Cloudinary, or your own CDN
            </p>
          </div>

          {branding.logo_url && (
            <div>
              <p className="text-xs text-secondary mb-2">Logo Preview</p>
              <div className="border border-border rounded-xl p-4 bg-muted/30 inline-block">
                <img
                  src={branding.logo_url}
                  alt="Logo preview"
                  className="h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = ''
                    e.currentTarget.alt = 'Invalid image URL'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Display Name */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">Display Name</h2>
        <p className="text-sm text-secondary mb-6">
          The business name shown to customers on payment links. Leave empty to use your account business name.
        </p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Merchant Display Name
          </label>
          <input
            type="text"
            value={branding.merchant_display_name || ''}
            onChange={(e) => setBranding({ ...branding, merchant_display_name: e.target.value })}
            className="input"
            placeholder="Your Business Name"
            maxLength={100}
          />
        </div>
      </div>

      {/* Primary Color */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">Primary Color</h2>
        <p className="text-sm text-secondary mb-6">
          This color will be used for buttons and accents on payment links.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Color Picker
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={branding.primary_color || '#2563eb'}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                className="w-16 h-16 rounded-xl border-2 border-border cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={branding.primary_color || ''}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="input font-mono"
                  placeholder="#2563eb"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
                <p className="text-xs text-secondary mt-1">Hex color code</p>
              </div>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { name: 'Blue', color: '#2563eb' },
                { name: 'Purple', color: '#7c3aed' },
                { name: 'Pink', color: '#db2777' },
                { name: 'Red', color: '#dc2626' },
                { name: 'Orange', color: '#ea580c' },
                { name: 'Green', color: '#16a34a' },
                { name: 'Teal', color: '#0d9488' },
                { name: 'Indigo', color: '#4f46e5' },
                { name: 'Slate', color: '#475569' },
                { name: 'Black', color: '#000000' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setBranding({ ...branding, primary_color: preset.color })}
                  className={`w-full h-12 rounded-xl border-2 transition-all ${
                    branding.primary_color === preset.color
                      ? 'border-foreground scale-95'
                      : 'border-border hover:scale-95'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Default Currency */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">Default Currency</h2>
        <p className="text-sm text-secondary mb-6">
          The currency displayed on payment links by default.
        </p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Currency
          </label>
          <select
            value={branding.default_currency || 'usd'}
            onChange={(e) => setBranding({ ...branding, default_currency: e.target.value })}
            className="input"
          >
            <option value="usd">USD - US Dollar</option>
            <option value="eur">EUR - Euro</option>
            <option value="gbp">GBP - British Pound</option>
            <option value="cad">CAD - Canadian Dollar</option>
            <option value="aud">AUD - Australian Dollar</option>
            <option value="jpy">JPY - Japanese Yen</option>
            <option value="chf">CHF - Swiss Franc</option>
            <option value="cny">CNY - Chinese Yuan</option>
            <option value="inr">INR - Indian Rupee</option>
            <option value="ngn">NGN - Nigerian Naira</option>
          </select>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card">
        <h2 className="text-xl font-semibold text-foreground mb-2">Payment Methods</h2>
        <p className="text-sm text-secondary mb-6">
          Available payment methods for your customers. Currently, only card payments are supported.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            <input
              type="checkbox"
              id="card"
              checked={branding.payment_methods?.includes('card')}
              disabled
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="card" className="flex items-center gap-3 flex-1 cursor-not-allowed">
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">Credit/Debit Card</p>
                <p className="text-xs text-secondary">Visa, Mastercard, Amex, and more</p>
              </div>
            </label>
            <span className="badge-success text-xs">Active</span>
          </div>

          <div className="p-4 bg-muted/10 border border-border rounded-xl">
            <p className="text-xs text-secondary">
              More payment methods coming soon! We're working on adding support for bank transfers, digital wallets, and local payment methods.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <div className="flex gap-3">
          <button
            onClick={resetToDefaults}
            className="btn-secondary flex-1"
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
