'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { 
  getCurrentUser, 
  signOut as amplifySignOut, 
  type AuthUser, 
  fetchUserAttributes, 
  updateUserAttributes as amplifyUpdateUserAttributes,
  updateUserAttribute,
  updateUserAttributes,
  fetchMFAPreference,
  updateMFAPreference,
  verifyTOTPSetup,
  setUpTOTP,
  updatePassword,
  type SetUpTOTPOutput,
  type UpdateUserAttributesInput,
  type UpdateMFAPreferenceInput
} from 'aws-amplify/auth'

type TOTPSetupResult = {
  success: boolean;
  error?: string;
  setupDetails?: {
    sharedSecret: string;
    getSetupUri: (appName: string, accountName: string) => string;
  };
};

type VerifyTOTPResult = {
  success: boolean;
  error?: string;
};

type MFAPreference = 'NOMFA' | 'TOTP';

// Extend the AuthUser type to include custom attributes
interface CustomAuthUser extends AuthUser {
  attributes?: {
    [key: string]: string | undefined;
    name?: string;
    email?: string;
    // Add other custom attributes you expect to use
  }
}
import { Hub } from 'aws-amplify/utils'

interface AuthContextType {
  user: CustomAuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
  updateUserAttributes: (attributes: Record<string, string>) => Promise<boolean>
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  setupTOTP: () => Promise<TOTPSetupResult>
  verifyTOTP: (code: string) => Promise<VerifyTOTPResult>
  getCurrentMFAPreference: () => Promise<string | undefined>
  setMFAPreference: (mfaMethod: 'NOMFA' | 'TOTP') => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomAuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      // Fetch user attributes separately
      try {
        const attributes = await fetchUserAttributes()
        setUser({
          ...currentUser,
          attributes: {
            ...attributes,
            name: attributes.name || attributes.given_name || attributes.nickname || currentUser.username
          }
        })
      } catch (error: any) {
        // Don't log expected errors when user is not authenticated
        if (error.name !== 'UserUnAuthenticatedException') {
          console.error('Error fetching user attributes:', error)
        }
        // If we can't fetch attributes, the token might be invalid
        if (error.name === 'NotAuthorizedException' || 
            error.message?.includes('Invalid login token') ||
            error.message?.includes('Token expired')) {
          await amplifySignOut()
          setUser(null)
          return
        }
        // For other attribute errors, still set the user
        setUser(currentUser)
      }
    } catch (error: any) {
      // Don't log expected errors when user is not authenticated
      if (error.name !== 'UserUnAuthenticatedException') {
        console.error('Error getting current user:', error)
      }
      if (error.name === 'NotAuthorizedException' || 
          error.message?.includes('Invalid login token') ||
          error.message?.includes('Token expired')) {
        await amplifySignOut()
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  useEffect(() => {
    // Define the Hub listener with proper typing
    const unsubscribe = Hub.listen('auth', ({ payload }: { payload: { event: string } }) => {
      switch (payload.event) {
        case 'signedIn':
          checkUser()
          break
        case 'signedOut':
          setUser(null)
          break
      }
    })

    // Cleanup function
    return () => {
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      } catch (error) {
        console.error('Error cleaning up auth listener:', error)
      }
    }
  }, [checkUser])

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [])

  const updateUserAttributes = async (attributes: Record<string, string>): Promise<boolean> => {
    try {
      console.log('Updating user attributes:', attributes);
      
      // Update each attribute one by one to handle errors individually
      for (const [key, value] of Object.entries(attributes)) {
        try {
          console.log(`Updating ${key}...`);
          await amplifyUpdateUserAttributes({ 
            userAttributes: { [key]: value } 
          });
          console.log(`Successfully updated ${key}`);
        } catch (error) {
          console.error(`Failed to update ${key}:`, error);
          throw error; // Re-throw to be caught by the outer catch
        }
      }
      
      // Refresh user data after all updates are successful
      await checkUser();
      return true;
    } catch (error) {
      console.error('Error updating user attributes:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          ...(error as any).$metadata,
        });
      }
      throw error; // Re-throw to handle in the component
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await updatePassword({ oldPassword, newPassword });
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to change password' 
      };
    }
  };

  // 2FA Functions
  const setupTOTP = async (): Promise<TOTPSetupResult> => {
    try {
      // First, ensure the user is properly authenticated
      const currentUser = await getCurrentUser();
      
      // Set up TOTP for the user
      const setupDetails = await setUpTOTP();
      
      console.log('TOTP Setup Details:', setupDetails);
      
      // In AWS Amplify, the MFA preference is set during verification
      // We'll handle the preference in the verifyTOTP function
      
      return { 
        success: true, 
        setupDetails: {
          sharedSecret: setupDetails.sharedSecret,
          getSetupUri: (appName: string, accountName: string) => {
            return `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(accountName)}?secret=${setupDetails.sharedSecret}&issuer=${encodeURIComponent(appName)}`;
          }
        }
      };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set up TOTP';
      
      // Provide more specific error messages for common issues
      if (errorMessage.includes('UserPoolConfiguration')) {
        return {
          success: false,
          error: 'MFA is not properly configured in your User Pool. Please enable TOTP MFA in your Cognito User Pool settings.'
        };
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const verifyTOTP = async (code: string): Promise<VerifyTOTPResult> => {
    try {
      // Verify the TOTP code
      await verifyTOTPSetup({ code });
      
      // After successful verification, set the preferred MFA method to TOTP
      try {
        // Update the MFA preference to use TOTP
        await updateMFAPreference({
          sms: 'DISABLED',  // Disable SMS MFA
          totp: 'PREFERRED' // Enable and prefer TOTP MFA
        });
        
        // Force refresh the user session to ensure the MFA preference is updated
        await fetchUserAttributes();
        
        console.log('TOTP verified and MFA preference set to TOTP');
      } catch (mfaError) {
        console.warn('Could not update MFA preference after verification:', mfaError);
        // The TOTP setup was still successful, so we'll continue
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify TOTP code' 
      };
    }
  };

  const getCurrentMFAPreference = async (): Promise<MFAPreference> => {
    try {
      try {
        // First try to get the MFA preference directly
        const mfaPrefs = await fetchMFAPreference();
        if (mfaPrefs.preferred === 'TOTP') {
          return 'TOTP';
        }
        return 'NOMFA';
      } catch (mfaError) {
        console.warn('Could not fetch MFA preferences:', mfaError);
        
        // Fallback to checking user attributes if direct MFA preference fails
        const attributes = await fetchUserAttributes();
        
        // Check if TOTP is enabled
        if (attributes['preferredMFA'] === 'SOFTWARE_TOKEN_MFA') {
          return 'TOTP';
        }
        
        // Default to no MFA if not set
        return 'NOMFA';
      }
    } catch (error) {
      console.error('Error getting MFA preference:', error);
      return 'NOMFA';
    }
  };

  const setMFAPreference = async (mfaMethod: MFAPreference) => {
    try {
      // Update MFA preference using AWS Amplify
      if (mfaMethod === 'TOTP') {
        // When enabling TOTP, we need to ensure the user has set it up first
        await updateMFAPreference({
          sms: 'DISABLED',
          totp: 'PREFERRED'
        });
      } else {
        // When disabling TOTP, set MFA to NONE
        await updateMFAPreference({
          sms: 'DISABLED',
          totp: 'DISABLED'
        });
      }
      
      // Refresh user attributes to get the latest MFA preference
      await fetchUserAttributes();
      
      return { success: true };
    } catch (error) {
      console.error('Error setting MFA preference:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set MFA preference' 
      };
    }
  };

  const value = {
    user,
    isLoading,
    signOut,
    updateUserAttributes,
    changePassword,
    setupTOTP,
    verifyTOTP,
    getCurrentMFAPreference,
    setMFAPreference,
  }

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
