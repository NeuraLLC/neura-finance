import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeuraPay - Merchant Dashboard',
  description: 'Accept payments, manage transactions, and grow your business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
