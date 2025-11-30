"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { route } from '@/utils/routing'

export default function PropertiesIndex() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Handle client-side routing for legacy /properties/manage - redirect to dashboard
    if (pathname === '/properties/manage') {
      router.replace(route('/dashboard/properties/manage'))
    } else {
      // Default to properties listing
      router.replace(route('/properties'))
    }
  }, [pathname, router])

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div>Loading...</div>
    </div>
  )
}
