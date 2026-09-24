'use client'

import { ChakraProvider, Box, extendTheme } from '@chakra-ui/react'
import { AuthProvider } from '@/features/auth/AuthContext'
import { AccountProvider } from '@/features/account/AccountContext'
import { ReactNode } from 'react'

// `colorScheme="primary"` / `bg="primary.600"` etc. are used all over this app (homepage,
// dashboard, billing, property pages) but no theme ever registered a "primary" color scale
// here — Chakra silently falls back to an unresolved CSS var, rendering those buttons with
// no background at all (invisible, though still present/clickable). #0e2949 is this app's
// established brand navy, already used as a literal hex value in email templates
// (zeptomail.ts) and several marketing pages — this scale is built around it as primary.600,
// matching how the homepage hero already uses `bg="primary.600"` for that exact navy.
const theme = extendTheme({
  colors: {
    primary: {
      50: '#EAF0F6',
      100: '#C7D6E5',
      200: '#A3BBD3',
      300: '#7FA1C2',
      400: '#5B86B0',
      500: '#123A5E',
      600: '#0E2949',
      700: '#0A1F38',
      800: '#08182A',
      900: '#050F1B',
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <AccountProvider>
          <Box as="main" minH="100vh" m="0 !important" p="0 !important" lineHeight="1">
            {children}
          </Box>
        </AccountProvider>
      </AuthProvider>
    </ChakraProvider>
  )
}
