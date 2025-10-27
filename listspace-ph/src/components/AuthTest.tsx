'use client';

import { useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';

export default function AuthTest() {
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        console.log('Authenticated user:', user);
      } catch (error) {
        console.log('Not authenticated:', error);
      }
    }
    
    checkAuth();
  }, []);

  return null;
}
