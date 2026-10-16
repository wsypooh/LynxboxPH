'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Amplify } from 'aws-amplify';
import { ResourcesConfig } from 'aws-amplify';
import { Providers } from './providers';
import { Navigation } from './Navigation';
import { Box } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { captureAttribution } from '@/lib/analytics';


// Configure Amplify immediately when this module loads in browser
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
          userAttributes: {
            email: { required: true },
            name: { required: true },
            phone_number: { required: false },
          },
          passwordFormat: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: true,
          },
        },
      },
      API: {
        REST: {
          lynxboxAPI: {
            endpoint: process.env.NEXT_PUBLIC_API_URL || '',
            region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-1',
          }
        }
      },
      Storage: {
        S3: {
          bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || '',
          region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-1',
        }
      }
    };

    console.log('Configuring Amplify with:', {
      region: process.env.NEXT_PUBLIC_AWS_REGION,
      userPoolId: config.Auth?.Cognito?.userPoolId?.substring(0, 10) + '...',
      userPoolClientId: config.Auth?.Cognito?.userPoolClientId?.substring(0, 10) + '...',
    });
    
    Amplify.configure(config, { ssr: true });
    console.log('✅ Amplify configured successfully');
  } catch (error) {
    console.error('❌ Error configuring Amplify:', error);
  }
}

const GA_ID = 'G-FJ0B3CH614';

export function RootShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isComingSoonPage = pathname?.startsWith('/coming-soon.html') || pathname?.startsWith('/coming-soon');
  const isLandingPage = pathname?.startsWith('/landlord') || pathname?.startsWith('/realtor') || pathname?.startsWith('/business-address') || pathname?.startsWith('/properties/bacolod-condo-for-sale') || isComingSoonPage;

  const [isProduction, setIsProduction] = useState(false);
  useEffect(() => {
    setIsProduction(window.location.hostname === 'lynxbox.ph');
    captureAttribution();
  }, []);

  return (
    <>
      {isProduction && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          {/* External file, not inline, so the CSP's script-src doesn't need 'unsafe-inline' */}
          <Script src="/gtag-init.js" strategy="afterInteractive" />
        </>
      )}
      <Providers>
        {!isLandingPage && <Navigation />}
        <Box as="main" pt={isLandingPage ? "0" : "70px"}>
          {children}
        </Box>
      </Providers>
    </>
  );
}
