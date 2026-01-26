import type { UserProfile, UpdateProfileData, ChangePasswordData, SubscriptionPlan } from '../types'
export type { UserProfile, UpdateProfileData, ChangePasswordData, SubscriptionPlan } from '../types'
import { getCurrentUser, updateUserAttributes, updatePassword } from 'aws-amplify/auth'

// Mock data for development - will be replaced with actual API calls
const mockUserProfile: UserProfile = {
  id: 'user-123',
  email: 'user@example.com',
  username: 'landlord123',
  name: 'Juan Dela Cruz',
  phoneNumber: '+639171234567',
  avatar: '/images/avatars/default-avatar.png',
  bio: 'Experienced commercial property owner with 10+ years in real estate',
  company: 'Delacruz Properties Inc.',
  address: {
    street: '123 Ayala Avenue',
    city: 'Makati',
    province: 'Metro Manila',
    postalCode: '1226',
    country: 'Philippines'
  },
  preferences: {
    language: 'en',
    currency: 'PHP',
    notifications: {
      email: true,
      sms: false,
      push: true
    }
  },
  subscription: {
    plan: 'professional',
    status: 'active',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2025-01-01T00:00:00Z',
    paymentMethod: {
      type: 'credit_card',
      last4: '4242',
      expiry: '12/25'
    }
  },
  stats: {
    propertiesListed: 15,
    propertiesRented: 12,
    totalEarnings: 1250000,
    responseRate: 95,
    responseTime: '2h 15m'
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: new Date().toISOString()
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'PHP',
    period: 'monthly',
    features: [
      '1 active listing',
      '3 photos per property',
      '7-day listing duration',
      'Basic search visibility',
      'Email support'
    ],
    buttonText: 'Current Plan',
    buttonVariant: 'outline',
    description: 'Perfect for getting started with one property listing.'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 1490,
    currency: 'PHP',
    period: 'monthly',
    features: [
      '10 active listings',
      'Unlimited photos',
      '30-day listing duration',
      'Priority search ranking',
      'Analytics dashboard',
      'Invoice generation',
      'Email & phone support'
    ],
    isPopular: true,
    buttonText: 'Upgrade Now',
    buttonVariant: 'solid',
    description: 'Ideal for growing property portfolios with multiple listings.'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4990,
    currency: 'PHP',
    period: 'monthly',
    features: [
      'Unlimited listings',
      'Unlimited photos & videos',
      'Featured property badges',
      'Advanced analytics',
      'API access',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom branding'
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'outline',
    description: 'For large portfolios and commercial real estate businesses.'
  }
]

export class ProfileService {
  static async getCurrentUserProfile(): Promise<UserProfile> {
    try {
      // In a real app, this would fetch from your API
      // const user = await getCurrentUser()
      // const response = await fetch(`/api/users/${user.userId}`)
      // return await response.json()
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockUserProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  static async updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
    try {
      // Update in Cognito
      if (updates.name || updates.phoneNumber) {
        const attributes: Record<string, string> = {}
        if (updates.name) attributes.name = updates.name
        if (updates.phoneNumber) attributes.phone_number = updates.phoneNumber
        
        if (Object.keys(attributes).length > 0) {
          await updateUserAttributes({
            userAttributes: attributes
          })
        }
      }

      // In a real app, update the rest of the profile in your database
      // const response = await fetch('/api/users/me', {
      //   method: 'PATCH',
      //   body: JSON.stringify(updates)
      // })
      // return await response.json()
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 800))

      // Ensure required preferences fields are preserved when partially updating
      const mergedPreferences: UserProfile["preferences"] = ((): UserProfile["preferences"] => {
        const current = mockUserProfile.preferences
        const incoming = updates.preferences
        if (!incoming) return current
        return {
          language: incoming.language ?? current?.language ?? "en",
          currency: incoming.currency ?? current?.currency ?? "PHP",
          notifications: {
            email: incoming.notifications?.email ?? current?.notifications.email ?? false,
            sms: incoming.notifications?.sms ?? current?.notifications.sms ?? false,
            push: incoming.notifications?.push ?? current?.notifications.push ?? false,
          },
        }
      })()

      return {
        ...mockUserProfile,
        ...updates,
        // Override with merged preferences to satisfy required fields
        preferences: mergedPreferences,
        updatedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  static async changePassword({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }): Promise<void> {
    try {
      // In a real app, you would call your API to change the password
      // which would then call Cognito
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword
      })
    } catch (error) {
      console.error('Error changing password:', error)
      throw error
    }
  }

  static async updateAvatar(file: File): Promise<string> {
    try {
      // In a real app, upload to S3 and return the URL
      // const formData = new FormData()
      // formData.append('avatar', file)
      // const response = await fetch('/api/users/me/avatar', {
      //   method: 'POST',
      //   body: formData
      // })
      // const data = await response.json()
      // return data.avatarUrl
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000))
      return '/images/avatars/new-avatar.jpg'
    } catch (error) {
      console.error('Error updating avatar:', error)
      throw error
    }
  }

  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    // In a real app, this would come from your API
    await new Promise(resolve => setTimeout(resolve, 300))
    return subscriptionPlans
  }

  static async updateSubscription(planId: string, period: 'monthly' | 'annual' = 'monthly'): Promise<{ success: boolean; message: string }> {
    try {
      // In a real app, this would integrate with your payment processor
      // const response = await fetch('/api/subscription', {
      //   method: 'POST',
      //   body: JSON.stringify({ planId, period })
      // })
      // return await response.json()
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1500))
      return {
        success: true,
        message: `Successfully subscribed to the ${planId} plan!`
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw error
    }
  }
}
