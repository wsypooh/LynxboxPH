"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function PropertiesIndex() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Handle client-side routing for /properties/add and /properties/manage
    if (pathname === '/properties/add') {
      router.replace('/properties/add.html')
    } else if (pathname === '/properties/manage') {
      router.replace('/properties/manage.html')
    } else {
      // Default to properties listing
      router.replace('/properties.html')
    }
  }, [pathname, router])

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div>Loading...</div>
    </div>
  )
}
