'use client'

import { Button, Tooltip, Box } from '@chakra-ui/react'
import Link from 'next/link'
import { route } from '@/utils/routing'
import { PricingTier } from './PricingComparisonTable'
import { Plan, BillingCycle } from '../types'

// Shared by the homepage and standalone pricing pages (both public, both logged-out and
// logged-in visitors) — logged out always sees "Get Started" -> signup. Logged in, the
// tier matching the account's actual current plan is disabled ("Current Plan"); every
// other tier gets a direction-agnostic "Switch Plan" label, since a plan below the
// current one is a downgrade, not an "upgrade" — using "Upgrade" for everything was
// misleading for a Free/lower-tier cell while on a paid plan.
//
// canManageBilling mirrors the billing page's own gate (only the account owner can
// submit payments/start trials — api/src/lib/auth.ts's canManageBilling) — a non-owner
// sees the same button, disabled, with a tooltip explaining why.
export default function PricingCtaButton({
  tier,
  cycle,
  isLoggedIn,
  currentPlan,
  canManageBilling,
}: {
  tier: PricingTier
  cycle: BillingCycle
  isLoggedIn: boolean
  currentPlan?: Plan | null
  canManageBilling: boolean
}) {
  if (!isLoggedIn) {
    const href = tier.slug === 'free' ? '/auth/signup' : `/auth/signup?plan=${tier.slug}&cycle=${cycle}`
    return (
      <Button as={Link} href={route(href)} colorScheme="primary" size="sm" w="full">
        Get Started
      </Button>
    )
  }

  if (currentPlan && tier.slug === currentPlan) {
    return <Button size="sm" w="full" isDisabled variant="outline">Current Plan</Button>
  }

  const href = tier.slug === 'free' ? '/dashboard/billing' : `/dashboard/billing?plan=${tier.slug}&cycle=${cycle}`
  const button = (
    <Button
      as={canManageBilling ? Link : undefined}
      href={canManageBilling ? route(href) : undefined}
      colorScheme="primary"
      size="sm"
      w="full"
      isDisabled={!canManageBilling}
    >
      Switch Plan
    </Button>
  )

  if (canManageBilling) return button

  // A disabled Button sets the native `disabled` attribute, which suppresses pointer
  // events entirely — Tooltip's hover trigger would never fire on the button itself.
  // Wrapping it in a plain, focusable Box gives the Tooltip something to actually hover.
  return (
    <Tooltip label="Only the account owner can manage billing">
      <Box tabIndex={0}>{button}</Box>
    </Tooltip>
  )
}
