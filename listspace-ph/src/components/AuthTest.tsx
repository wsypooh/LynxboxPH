'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { getCurrentJWTToken, getCurrentUserId } from '../lib/auth';
import { propertyService } from '../services/propertyService';

export default function AuthTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    async function testAuthFlow() {
      addResult('🧪 Starting JWT Authentication Flow Test');
      
      // Test 1: Check if user is authenticated
      try {
        const user = await getCurrentUser();
        addResult(`✅ User authenticated: ${user.username} (${user.userId})`);
      } catch (error) {
        addResult(`❌ Not authenticated: ${error}`);
        return;
      }

      // Test 2: Get JWT Token
      try {
        const jwtToken = await getCurrentJWTToken();
        if (jwtToken) {
          addResult(`✅ JWT Token obtained (length: ${jwtToken.length})`);
          // Show first few characters to verify it's a JWT
          const tokenPreview = jwtToken.substring(0, 50) + '...';
          addResult(`📝 Token preview: ${tokenPreview}`);
        } else {
          addResult('❌ Failed to get JWT Token');
          return;
        }
      } catch (error) {
        addResult(`❌ JWT Token error: ${error}`);
        return;
      }

      // Test 3: Get User ID from JWT
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          addResult(`✅ User ID from JWT: ${userId}`);
        } else {
          addResult('❌ Failed to get User ID from JWT');
        }
      } catch (error) {
        addResult(`❌ User ID error: ${error}`);
      }

      // Test 4: Test authenticated API call
      try {
        addResult('🌐 Testing authenticated API call...');
        const properties = await propertyService.listProperties({ limit: 5 });
        addResult(`✅ Authenticated API call successful: Found ${properties.items.length} properties`);
      } catch (error) {
        addResult(`❌ Authenticated API call failed: ${error}`);
      }

      // Test 5: Test public API call
      try {
        addResult('🌐 Testing public API call...');
        const publicProperties = await propertyService.listPublicProperties({ limit: 5 });
        addResult(`✅ Public API call successful: Found ${publicProperties.items.length} properties`);
      } catch (error) {
        addResult(`❌ Public API call failed: ${error}`);
      }

      // Test 6: Test public search API call
      try {
        addResult('🔍 Testing public search API call...');
        const searchResults = await propertyService.searchProperties('office', 3);
        addResult(`✅ Public search API call successful: Found ${searchResults.items.length} results`);
      } catch (error) {
        addResult(`❌ Public search API call failed: ${error}`);
      }

      // Test 7: Test user search API call
      try {
        addResult('🔍 Testing user search API call...');
        const userSearchResults = await propertyService.searchUserProperties('office', 3);
        addResult(`✅ User search API call successful: Found ${userSearchResults.items.length} results`);
      } catch (error) {
        addResult(`❌ User search API call failed: ${error}`);
      }

      addResult('🏁 JWT Authentication Flow Test Complete');
    }
    
    testAuthFlow();
  }, []);

  // Display results in development mode
  if (process.env.NODE_ENV === 'development' && testResults.length > 0) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        maxWidth: '400px',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>JWT Auth Test Results:</div>
        {testResults.map((result, index) => (
          <div key={index} style={{ marginBottom: '4px' }}>
            {result}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
