export interface UserProfile {
  id: string
  email: string
  username: string
  name: string
  phoneNumber?: string
  avatar?: string
  bio?: string
  company?: string
  address?: {
    street?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
  }
  preferences?: {
    language: string
    currency: string
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
    }
  }
  subscription?: {
    plan: 'free' | 'professional' | 'enterprise'
    status: 'active' | 'trial' | 'expired' | 'cancelled'
    startDate: string
    endDate?: string
    paymentMethod?: {
      type: string
      last4?: string
      expiry?: string
    }
  }
  stats?: {
    propertiesListed: number
    propertiesRented: number
    totalEarnings: number
    responseRate: number
    responseTime: string
  }
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileData {
  name?: string
  phoneNumber?: string
  bio?: string
  company?: string
  address?: {
    street?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
  }
  preferences?: {
    language?: string
    currency?: string
    notifications?: {
      email?: boolean
      sms?: boolean
      push?: boolean
    }
  }
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  period: 'monthly' | 'annual'
  features: string[]
  isPopular?: boolean
  recommended?: boolean
  buttonText: string
  buttonVariant: 'outline' | 'solid'
  description: string
}
