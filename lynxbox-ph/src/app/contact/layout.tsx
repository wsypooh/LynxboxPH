import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Lynxbox PH team about listings, rental management, or support.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
