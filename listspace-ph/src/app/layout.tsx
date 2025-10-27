'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { ResourcesConfig } from 'aws-amplify';
import { Providers } from '@/components/providers';
import { Navigation } from '@/components/Navigation';
import { Box } from '@chakra-ui/react';

const inter = Inter({ subsets: ['latin'] });

// Only configure Amplify in the browser
if (typeof window !== 'undefined') {
  try {
    const config: ResourcesConfig = {
      Auth: {
        Cognito: {
          userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID!,
          userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID!,
          identityPoolId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID!,
          loginWith: {
            email: true,
          },
          signUpVerificationMethod: 'code' as const,
        },
      },
    };

    console.log('Configuring Amplify with:', {
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      userPoolId: config.Auth?.Cognito?.userPoolId?.substring(0, 10) + '...',
    });
    
    Amplify.configure(config);
    console.log('Amplify configured successfully');
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
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
  );
}
