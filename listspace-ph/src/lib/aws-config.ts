// This file configures AWS Amplify with environment variables
import { Amplify } from 'aws-amplify';
import { ResourcesConfig } from 'aws-amplify';

export const configureAmplify = () => {
  // Only configure in browser environment
  if (typeof window === 'undefined') return;

  const config: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID!,
        identityPoolId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID!,
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true,
        },
      },
    },
    Storage: {
      S3: {
        bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
        region: process.env.NEXT_PUBLIC_AWS_REGION,
      },
    },
  };

  console.log('Configuring Amplify with:', {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: config.Auth?.Cognito?.userPoolId ? 
      config.Auth.Cognito.userPoolId.substring(0, 10) + '...' : 'not configured',
    userPoolClientId: config.Auth?.Cognito?.userPoolClientId ? 
      config.Auth.Cognito.userPoolClientId.substring(0, 8) + '...' : 'not configured',
  });

  try {
    Amplify.configure(config);
    console.log('AWS Amplify is configured');
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
};

// Call configureAmplify when this module is imported
if (typeof window !== 'undefined') {
  configureAmplify();
}
