import type { Metadata } from 'next'
import { HelpLayout } from '@/components/help/HelpLayout'
import { getAllHelpArticles } from '@/lib/help'

export const metadata: Metadata = {
  title: 'Help Center | Lynxbox PH',
  description: 'Guides for managing buildings, tenants, invoices, payments, and listings on Lynxbox PH.',
}

export default function HelpIndexPage() {
  const nav = getAllHelpArticles().map(({ slug, title, summary }) => ({ slug, title, summary }))
  return <HelpLayout nav={nav} />
}
