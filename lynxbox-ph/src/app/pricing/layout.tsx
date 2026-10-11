import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Plans and pricing for Lynxbox PH: list commercial properties and manage tenants, invoices and payments, from Free to Business.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
