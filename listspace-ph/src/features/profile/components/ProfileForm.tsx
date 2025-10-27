'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { UserProfile, UpdateProfileData } from '../types'
import { ProfileService } from '../services/profileService'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  phoneNumber: z.string().min(10, {
    message: 'Please enter a valid phone number.',
  }),
  company: z.string().optional(),
  bio: z.string().max(500, {
    message: 'Bio must not be longer than 500 characters.',
  }),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
  preferences: z.object({
    language: z.string(),
    currency: z.string(),
    notifications: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
    }),
  }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  profile: UserProfile
  onUpdate: (updatedProfile: UserProfile) => void
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      phoneNumber: profile.phoneNumber || '',
      company: profile.company || '',
      bio: profile.bio || '',
      address: {
        street: profile.address?.street || '',
        city: profile.address?.city || '',
        province: profile.address?.province || '',
        postalCode: profile.address?.postalCode || '',
        country: profile.address?.country || 'Philippines',
      },
      preferences: {
        language: profile.preferences?.language || 'en',
        currency: profile.preferences?.currency || 'PHP',
        notifications: {
          email: profile.preferences?.notifications?.email || false,
          sms: profile.preferences?.notifications?.sms || false,
          push: profile.preferences?.notifications?.push || false,
        },
      },
    },
  })

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true)
      const updatedProfile = await ProfileService.updateProfile({
        name: data.name,
        phoneNumber: data.phoneNumber,
        company: data.company,
        bio: data.bio,
        address: {
          street: data.address.street,
          city: data.address.city,
          province: data.address.province,
          postalCode: data.address.postalCode,
          country: data.address.country,
        },
        preferences: {
          language: data.preferences.language,
          currency: data.preferences.currency,
          notifications: {
            email: data.preferences.notifications.email,
            sms: data.preferences.notifications.sms,
            push: data.preferences.notifications.push,
          },
        },
      })

      onUpdate(updatedProfile)
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} disabled />
                  </FormControl>
                  <FormDescription>
                    Contact support to change your email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+63 912 345 6789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us a bit about yourself and your properties..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium">Address</h3>
            <p className="text-sm text-muted-foreground">
              Your primary business address
            </p>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Makati" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province/State</FormLabel>
                    <FormControl>
                      <Input placeholder="Metro Manila" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium">Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Your account preferences
            </p>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="preferences.language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="en">English</option>
                      <option value="tl">Filipino</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="preferences.currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="PHP">Philippine Peso (₱)</option>
                      <option value="USD">US Dollar ($)</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium">Notification Preferences</h4>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="preferences.notifications.email"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Email Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive notifications via email
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div className="h-6 w-10 rounded-full bg-muted p-0.5">
                          <div
                            className={`h-5 w-5 rounded-full transition-transform ${field.value ? 'translate-x-4 bg-primary' : 'bg-muted-foreground'}`}
                            onClick={() => field.onChange(!field.value)}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preferences.notifications.sms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          SMS Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive notifications via SMS (standard rates may apply)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div className="h-6 w-10 rounded-full bg-muted p-0.5">
                          <div
                            className={`h-5 w-5 rounded-full transition-transform ${field.value ? 'translate-x-4 bg-primary' : 'bg-muted-foreground'}`}
                            onClick={() => field.onChange(!field.value)}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preferences.notifications.push"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Push Notifications
                        </FormLabel>
                        <FormDescription>
                          Receive notifications in your browser or mobile app
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div className="h-6 w-10 rounded-full bg-muted p-0.5">
                          <div
                            className={`h-5 w-5 rounded-full transition-transform ${field.value ? 'translate-x-4 bg-primary' : 'bg-muted-foreground'}`}
                            onClick={() => field.onChange(!field.value)}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Profile
          </Button>
        </div>
      </form>
    </Form>
  )
}
