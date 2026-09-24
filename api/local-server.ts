// Add this at the very top of the file
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });  // Explicitly load .env file

import express from 'express';
import { handler as mainHandler } from './dist/index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Log environment variables for debugging
console.log('=== ENVIRONMENT DEBUG ===');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('DYNAMODB_TABLE:', process.env.DYNAMODB_TABLE);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('========================');

// Force AWS SDK to use credentials from environment variables
process.env.AWS_SDK_LOAD_CONFIG = 'true';

// Initialize AWS SDK with explicit credentials
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

// Log AWS configuration
console.log('AWS Configuration:', {
  region: awsConfig.region,
  accessKeyId: awsConfig.credentials.accessKeyId ? 
    awsConfig.credentials.accessKeyId.substring(0, 4) + '...' : 'Not set',
  dynamoTable: process.env.DYNAMODB_TABLE || 'Not set',
  dynamoRegion: process.env.AWS_REGION || 'Not set'
});

const ddb = new DynamoDBClient(awsConfig);

const app = express();
const port = 3000;

app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Account-Id');
  res.header('Access-Control-Max-Age', '300');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Helper to convert Express request to API Gateway event
const createApiGatewayEvent = (req: express.Request): APIGatewayProxyEvent => {
  // For local development, add a mock user ID
  const headers = { ...req.headers } as { [name: string]: string };
  
  // Check if this is a public endpoint (no authentication required)
  const isPublicEndpoint = req.path.startsWith('/api/public/');
  
  // Extract user ID from Authorization header if present (for real Cognito auth)
  let userId = 'local-test-user-123'; // Default fallback
  let username = 'local-test-user';
  let email = 'test@example.com';
  let name: string | undefined;
  let groups: string[] | undefined;

  if (req.headers.authorization && !isPublicEndpoint) {
    try {
      // Try to parse JWT token to get actual user info
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // Decode JWT token to get user ID
        try {
          // JWT tokens are base64 encoded, split by '.' and decode the payload
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

            // Extract user ID from JWT payload
            if (payload.sub) {
              userId = payload.sub;
              username = payload['cognito:username'] || payload.username || 'unknown';
              email = payload.email || payload['cognito:email'] || 'unknown@example.com';
              name = payload.name;
              groups = payload['cognito:groups'];
            }
          }
        } catch (decodeError) {
          // Use fallback values on decode error
        }
      }
    } catch (error) {
      // Use fallback values on parse error
    }
  }
  
  return {
    httpMethod: req.method || 'GET',
    path: req.path,
    headers: headers,
    queryStringParameters: req.query as { [name: string]: string } || {},
    pathParameters: req.params || {},
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      httpMethod: req.method || 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: req.ip || '127.0.0.1',
        user: null,
        userAgent: req.get('user-agent') || '',
        userArn: null,
      },
      authorizer: isPublicEndpoint ? null : {
        claims: {
          sub: userId, // Use the determined user ID
          'cognito:username': username,
          email: email,
          ...(name ? { name } : {}),
          ...(groups ? { 'cognito:groups': groups } : {}),
        }
      },
      path: req.path,
      protocol: req.protocol,
      requestId: 'local-test-request',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      resourceId: 'local',
      resourcePath: req.path,
      stage: 'local',
    },
    resource: req.path,
    stageVariables: null,
  } as unknown as APIGatewayProxyEvent;
};

// API routes
app.all('/api/properties', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/properties/:id', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Public endpoints (no authentication required)
app.all('/api/public/properties', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/public/properties/:id', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/public/search', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Unified search and filter route
app.all('/api/properties/search', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Image endpoints
app.all('/api/properties/:id/images', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/properties/:id/images/upload-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/properties/:id/images/view-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/public/properties/:id/images/view-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});

app.all('/api/public/listings/:id/images/view-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Signup endpoint
app.all('/api/signup', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Buildings routes
app.all('/api/buildings', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/buildings/:id', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/buildings/:id/tenants', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Tenants routes
app.all('/api/tenants', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/tenants/:id', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/tenants/:id/invoices', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Ledger routes
app.all('/api/ledger/charges', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/tenants/:id/ledger', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/tenants/:id/ledger/reset', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/tenants/:id/payments', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Documents routes
app.all('/api/documents', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/documents/upload-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/documents/:id', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/documents/:id/view-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Platform Admin routes
app.all('/api/platform-admin/dashboard/summary', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/accounts/:accountId', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/accounts/:accountId/plan', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// docs/Payments-and-Subscription-Plan.md — Platform-admin payment verification
app.all('/api/platform-admin/payment-submissions', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/payment-submissions/:id/view-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/payment-submissions/:id/approve', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/payment-submissions/:id/reject', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/accounts/:accountId/extend-trial', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/promo-codes', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/promo-codes/:code', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/platform-admin/promo-codes/:code/deactivate', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Account / Member routes
app.all('/api/account/me', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/account/memberships', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/account/members', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/account/members/:sub', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// docs/Payments-and-Subscription-Plan.md — Billing
app.all('/api/billing/status', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/billing/usage', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/billing/start-trial', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/billing/downgrade-to-free', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/billing/payment-submissions/upload-url', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/billing/payment-submissions', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/billing/promo-codes/validate', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// docs/Payments-and-Subscription-Plan.md — Public promo codes
app.all('/api/public/promo-codes/active-auto-apply', async (req, res) => {
  await handlePropertyRequest(req, res);
});

// Invoices routes
app.all('/api/invoices', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/batch-pdf', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/:id', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/:id/payments', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/:id/send', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/:id/rollover', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/:id/void', async (req, res) => {
  await handlePropertyRequest(req, res);
});
app.all('/api/invoices/:id/pdf', async (req, res) => {
  await handlePropertyRequest(req, res);
});

async function handlePropertyRequest(req: express.Request, res: express.Response) {
  try {
    const event = createApiGatewayEvent(req);
    const result = await mainHandler(event);
    
    // Set response status and headers
    res.status(result.statusCode || 200);
    
    // Set all response headers
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          res.setHeader(key, value);
        } else if (Array.isArray(value)) {
          res.setHeader(key, value.map(String));
        }
      });
    }
    
    // Send response body
    if (result.body) {
      if (result.isBase64Encoded) {
        res.send(Buffer.from(result.body, 'base64'));
      } else {
        try {
          res.send(JSON.parse(result.body));
        } catch {
          res.send(result.body);
        }
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`API available at http://localhost:${port}/api/properties`);
});