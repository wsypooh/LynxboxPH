'use client'

import { useState, useEffect } from 'react'
import { ProfileService, type SubscriptionPlan } from '../services/profileService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Loader2, Zap } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export function SubscriptionManagement({ currentPlanId }: { currentPlanId: string }): JSX.Element {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await ProfileService.getSubscriptionPlans()
        setPlans(data)
      } catch (error) {
        console.error('Error fetching subscription plans:', error)
        toast({
          title: 'Error',
          description: 'Failed to load subscription plans. Please try again later.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlans()
  }, [toast])

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlanId) return
    
    try {
      setIsUpgrading(planId)
      const result = await ProfileService.updateSubscription(planId)
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        })
        // Refresh the page or update the UI to reflect the new subscription
        window.location.reload()
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      toast({
        title: 'Error',
        description: 'Failed to update subscription. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpgrading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscription Plans</h2>
        <p className="text-muted-foreground">
          Choose the plan that fits your needs. You can upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.id === currentPlanId ? 'ring-2 ring-primary' : ''
            } ${plan.isPopular ? 'border-primary' : ''}`}
          >
            {plan.isPopular && (
              <div className="absolute right-0 top-0 bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                MOST POPULAR
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                {plan.id === currentPlanId && (
                  <Badge variant="secondary" className="text-sm">
                    Current Plan
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-extrabold">
                  {plan.price === 0 ? 'Free' : `₱${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    /{plan.period === 'monthly' ? 'month' : 'year'}
                  </span>
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="mr-2 h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.id === currentPlanId || isUpgrading === plan.id}
                className={`w-full ${plan.isPopular ? 'bg-primary hover:bg-primary/90' : ''}`}
                size="lg"
              >
                {isUpgrading === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : plan.id === currentPlanId ? (
                  'Current Plan'
                ) : plan.id === 'enterprise' ? (
                  'Contact Sales'
                ) : plan.isPopular ? (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    {plan.buttonText}
                  </>
                ) : (
                  plan.buttonText
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 rounded-full bg-primary/10 p-2 text-primary">
            <Crown className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium">Need more?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              For businesses with more than 50 properties or custom requirements, our enterprise plan offers
              custom pricing and dedicated support.
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-dashed p-6 text-center">
        <h3 className="text-lg font-medium">Questions about billing?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
            We&#39;re here to help! Contact our support team for any billing-related questions.
        </p>
        <Button variant="ghost" size="sm" className="mt-3">
          Contact Support
        </Button>
      </div>
    </div>
  )
}
