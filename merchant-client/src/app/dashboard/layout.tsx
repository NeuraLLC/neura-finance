'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import OnboardingGate from '@/components/OnboardingGate'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      router.push('/')
    }
  }, [router])

  return (
    <OnboardingGate>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </OnboardingGate>
  )
}
