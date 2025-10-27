'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { getCurrentUser, signOut as amplifySignOut, type AuthUser } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
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

  const value = {
    user,
    isLoading,
    signOut,
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
