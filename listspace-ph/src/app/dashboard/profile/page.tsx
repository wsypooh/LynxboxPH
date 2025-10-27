'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ProfileForm } from '@/features/profile/components/ProfileForm'
import { ChangePasswordForm } from '@/features/profile/components/ChangePasswordForm'
import { SubscriptionManagement } from '@/features/profile/components/SubscriptionManagement'
import { ProfileService } from '@/features/profile/services/profileService'
import type { UserProfile } from '@/features/profile/types'
import { useAuth } from '@/features/auth/AuthContext'
import { Loader2, User, Lock, CreditCard, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription'>('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        return
      }

      try {
        const userProfile = await ProfileService.getCurrentUserProfile()
        setProfile(userProfile as UserProfile)
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user, router])

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (isLoading || !profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex-1">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-64 space-y-6">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-16" />
                <CardContent className="pt-12 pb-6 px-6 -mt-12 relative">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-800">
                      <AvatarImage src={profile.avatar} alt={profile.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-semibold">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="mt-4 text-xl font-semibold">{profile.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {profile.company || 'No company'}
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {profile.subscription?.plan || 'Free'} Plan
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Account Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Properties</span>
                    <span className="font-medium">{profile.stats?.propertiesListed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rented</span>
                    <span className="font-medium">{profile.stats?.propertiesRented || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Earnings</span>
                    <span className="font-medium">₱{(profile.stats?.totalEarnings || 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p>Profile updated</p>
                        <p className="text-xs">{new Date(profile.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <p>Password changed</p>
                        <p className="text-xs">{new Date(profile.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p>Subscription renewed</p>
                        <p className="text-xs">{new Date(profile.subscription?.startDate || profile.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details here</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileForm profile={profile} onUpdate={handleProfileUpdate} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Manage your contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email || 'No email provided'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.phoneNumber || 'No phone number provided'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password here</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Two-factor authentication is currently disabled.
              </p>
              <Button variant="outline">Set up 2FA</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionManagement currentPlanId={profile.subscription?.plan || 'free'} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
