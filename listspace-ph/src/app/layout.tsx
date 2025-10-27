import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import '@/lib/amplify'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ListSpace PH',
  description: 'Commercial property listing and management platform',
}

import { Navigation } from '@/components/Navigation'
import { Box } from '@chakra-ui/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <Box as="main" pt="70px">
            {children}
          </Box>
        </Providers>
      </body>
    </html>
  )
}
