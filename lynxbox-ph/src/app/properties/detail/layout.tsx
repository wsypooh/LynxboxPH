import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Property Details | Lynxbox PH' },
  description: 'Commercial property listing on Lynxbox PH.',
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
