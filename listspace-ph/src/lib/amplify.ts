import { Amplify } from 'aws-amplify'
import type { ResourcesConfig } from 'aws-amplify'

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID || '',
      identityPoolId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID || '',
      loginWith: {
        email: true,
      },
      userPoolEndpoint: process.env.NEXT_PUBLIC_COGNITO_ENDPOINT,
      signUpVerificationMethod: 'code',
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
    }
  },
  API: {
    REST: {
      listspaceAPI: {
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
}

export default amplifyConfig

// Apply configuration with SSR support
Amplify.configure(amplifyConfig, { ssr: true })
