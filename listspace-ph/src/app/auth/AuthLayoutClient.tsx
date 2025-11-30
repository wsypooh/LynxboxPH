'use client';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, ColorModeScript, Box, Container, Flex, Heading, VStack } from '@chakra-ui/react';
import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const theme = extendTheme({
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode('gray.50', 'gray.900')(props),
        color: mode('gray.800', 'whiteAlpha.900')(props),
        fontFamily: inter.style.fontFamily,
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'md',
      },
      defaultProps: {
        colorScheme: 'blue',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'blue.500',
      },
    },
  },
});

export default function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <CacheProvider>
        <ChakraProvider theme={theme}>
          <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50" _dark={{ bg: 'gray.900' }}>
            <Box w="100%" maxW="md" p={8}>
              {children}
            </Box>
          </Box>
        </ChakraProvider>
      </CacheProvider>
    </>
  );
}
