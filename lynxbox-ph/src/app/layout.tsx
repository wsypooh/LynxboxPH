import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RootShell } from '@/components/RootShell'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://lynxbox.ph'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Lynxbox PH - Commercial Property Listings',
    template: '%s | Lynxbox PH',
  },
  description:
    'Digital listing and rental management platform for small commercial property owners in the Philippines',
  icons: { icon: '/favicon.png' },
  openGraph: {
    type: 'website',
    siteName: 'Lynxbox PH',
    locale: 'en_PH',
    url: SITE_URL,
    title: 'Lynxbox PH - Commercial Property Listings',
    description:
      'Digital listing and rental management platform for small commercial property owners in the Philippines',
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
