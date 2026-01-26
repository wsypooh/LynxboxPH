'use client'

import { ChakraProvider, Box } from '@chakra-ui/react'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Box as="main" minH="100vh" m="0 !important" p="0 !important" lineHeight="1">
          {children}
        </Box>
      </AuthProvider>
    </ChakraProvider>
  )
}
