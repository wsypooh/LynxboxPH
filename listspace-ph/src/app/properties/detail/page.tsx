"use client"

import { useSearchParams } from 'next/navigation'
import PropertyDetailClient from '../[id]/PropertyDetailClient'

export default function PropertyDetailPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  
  if (!id) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Property ID not found</h1>
        <p>Please provide a property ID in the URL</p>
      </div>
    )
  }
  
  return <PropertyDetailClient id={id} />
}
