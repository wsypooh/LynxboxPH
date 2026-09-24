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
