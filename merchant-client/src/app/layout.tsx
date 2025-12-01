import type { Metadata } from 'next'
import './globals.css'

const metadata: Metadata = {
  title: 'Neura Finance - Merchant Dashboard',
  description: 'Accept payments, manage transactions, and grow your business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.stripe.com/v3/" async></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
