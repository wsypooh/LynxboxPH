import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RootShell } from '@/components/RootShell'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://lynxbox.ph'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Commercial Rental Management | Lynxbox PH',
    template: '%s | Lynxbox PH',
  },
  description:
    'Manage tenants, leases, rental billing, and records in one place. Start free with Lynxbox PH, built for small commercial landlords in the Philippines.',
  icons: { icon: '/favicon.png' },
  openGraph: {
    type: 'website',
    siteName: 'Lynxbox PH',
    locale: 'en_PH',
    url: SITE_URL,
    title: 'Commercial Rental Management | Lynxbox PH',
    description:
      'Manage tenants, leases, rental billing, and records in one place. Start free with Lynxbox PH, built for small commercial landlords in the Philippines.',
    images: ['/lynxboxph-logo.png'],
  },
  twitter: { card: 'summary' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  )
}
