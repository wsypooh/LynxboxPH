import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Commercial Properties for Rent in the Philippines',
  description: 'Browse offices, retail spaces, warehouses, industrial properties and land listed directly by owners across the Philippines.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
