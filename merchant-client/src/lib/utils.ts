import { clsx, type ClassValue } from 'clsx'

/**
 * Merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100) // Amount is in cents
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return formatDate(date)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    succeeded: 'text-success',
    pending: 'text-warning',
    processing: 'text-accent',
    failed: 'text-error',
    refunded: 'text-secondary',
    active: 'text-success',
    inactive: 'text-secondary',
  }
  return colors[status] || 'text-secondary'
}

/**
 * Get status badge class
 */
export function getStatusBadgeClass(status: string): string {
  const badges: Record<string, string> = {
    succeeded: 'badge-success',
    pending: 'badge-warning',
    processing: 'badge bg-accent/10 text-accent',
    failed: 'badge-error',
    refunded: 'badge-secondary',
    active: 'badge-success',
    inactive: 'badge-secondary',
  }
  return badges[status] || 'badge-secondary'
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Generate payment link URL
 */
export function getPaymentLinkUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return `${baseUrl}/pay/${slug}`
}
