'use client'

import { Box, Table, Thead, Tbody, Tr, Th, Td, Badge, VStack, HStack, Text, ButtonGroup, Button } from '@chakra-ui/react'
import { ReactNode, useState, useEffect } from 'react'
import { Plan, PromoCode, BillingCycle, PLAN_PRICING } from '../types'
import { calculateDisplayAmount, isPromoApplicableToPlan, getPromoDurationLabel } from '../pricingMath'
import { billingService } from '@/services/billingService'

// docs/Pricing-Strategy-Plan.md — same row labels/order as that doc's tier table. Shared
// between the public homepage (lynxbox-ph/src/app/page.tsx) and the authenticated billing
// page (dashboard/billing) so the tier data/row definitions only live in one place — only
// the CTA cell differs per context (marketing links vs. trial/plan-change actions).
// Price/period aren't stored here — they're derived from PLAN_PRICING per the selected
// billing cycle (see getTierPricing below), so the two can't drift out of sync.
export const PRICING_TIERS = [
  {
    name: 'Free Forever',
    slug: 'free' as Plan,
    popular: false,
    rows: [
      ['Active property listings', '2'],
      ['Photos per listing', '3'],
      ['Listing visibility duration', '7 days (manual renew)'],
      ['Public search placement', 'Standard'],
      ['Invoices/month', '10'],
      ['Team seats', '1'],
      ['Document storage', '250MB'],
      ['Batch ZIP invoice download', '–'],
      ['PDF branding', 'Lynxbox branded'],
      ['Support', 'Best-effort email'],
    ],
  },
  {
    name: 'Starter',
    slug: 'starter' as Plan,
    popular: false,
    rows: [
      ['Active property listings', '5'],
      ['Photos per listing', '10'],
      ['Listing visibility duration', '30 days'],
      ['Public search placement', 'Standard'],
      ['Invoices/month', '50'],
      ['Team seats', '2'],
      ['Document storage', '1GB'],
      ['Batch ZIP invoice download', '✓'],
      ['PDF branding', 'Unbranded'],
      ['Support', 'Email'],
    ],
  },
  {
    name: 'Growth',
    slug: 'growth' as Plan,
    popular: true,
    rows: [
      ['Active property listings', '15'],
      ['Photos per listing', '10'],
      ['Listing visibility duration', '60 days'],
      ['Public search placement', 'Priority'],
      ['Invoices/month', '200'],
      ['Team seats', '5'],
      ['Document storage', '5GB'],
      ['Batch ZIP invoice download', '✓'],
      ['PDF branding', 'Unbranded + custom logo'],
      ['Support', 'Priority email/chat'],
    ],
  },
  {
    name: 'Business',
    slug: 'business' as Plan,
    popular: false,
    rows: [
      ['Active property listings', 'Unlimited'],
      ['Photos per listing', '10'],
      ['Listing visibility duration', 'No expiry'],
      ['Public search placement', 'Top/Featured'],
      ['Invoices/month', 'Unlimited'],
      ['Team seats', 'Unlimited'],
      ['Document storage', 'Unlimited (fair use)'],
      ['Batch ZIP invoice download', '✓'],
      ['PDF branding', 'Full white-label'],
      ['Support', 'Priority + dedicated onboarding'],
    ],
  },
] as const

export type PricingTier = typeof PRICING_TIERS[number]

function getTierPricing(slug: Plan, cycle: BillingCycle): { price: string; period: string } {
  if (slug === 'free') return { price: '₱0', period: 'Perfect for getting started' }
  const amount = PLAN_PRICING[slug][cycle]
  return { price: `₱${amount.toLocaleString()}`, period: cycle === 'annual' ? 'per year' : 'per month' }
}

interface PricingComparisonTableProps {
  renderCta: (tier: PricingTier, cycle: BillingCycle) => ReactNode
}

export default function PricingComparisonTable({ renderCta }: PricingComparisonTableProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')

  // Auto-apply promo (docs/Payments-and-Subscription-Plan.md) — the whole point is that
  // it shows up directly in the displayed price with no code entry, so it's fetched and
  // rendered right here rather than only at payment-submission time.
  const [autoPromo, setAutoPromo] = useState<PromoCode | null>(null)

  useEffect(() => {
    billingService.getActiveAutoApplyPromo().then(setAutoPromo).catch(() => {})
  }, [])

  return (
    <VStack spacing={4} w="full">
      <ButtonGroup isAttached variant="outline" size="sm">
        <Button
          onClick={() => setCycle('monthly')}
          colorScheme={cycle === 'monthly' ? 'primary' : undefined}
          variant={cycle === 'monthly' ? 'solid' : 'outline'}
        >
          Monthly
        </Button>
        <Button
          onClick={() => setCycle('annual')}
          colorScheme={cycle === 'annual' ? 'primary' : undefined}
          variant={cycle === 'annual' ? 'solid' : 'outline'}
        >
          Annual (2 months free)
        </Button>
      </ButtonGroup>

      <Box w="full" maxW="6xl" overflowX="auto" bg="white" borderRadius="lg" boxShadow="sm">
        <Table variant="simple" minW="900px" sx={{ tableLayout: 'fixed' }}>
          <Thead>
            <Tr>
              <Th w="180px"></Th>
              {PRICING_TIERS.map(tier => {
                const { price, period } = getTierPricing(tier.slug, cycle)
                const discounted = tier.slug !== 'free' && autoPromo && isPromoApplicableToPlan(autoPromo, tier.slug)
                  ? calculateDisplayAmount(tier.slug, cycle, autoPromo)
                  : null

                return (
                  <Th key={tier.name} w={`${80 / PRICING_TIERS.length}%`} textAlign="center" bg={tier.popular ? 'primary.50' : undefined} borderTopWidth={tier.popular ? 2 : 0} borderColor="primary.500">
                    <VStack spacing={1} py={2} textTransform="none">
                      {tier.popular && <Badge colorScheme="primary" mb={1}>Most Popular</Badge>}
                      <Text fontSize="md" fontWeight="bold" color="gray.800">{tier.name}</Text>
                      {discounted ? (
                        <VStack spacing={0}>
                          <Text as="s" fontSize="sm" color="gray.400">{price}</Text>
                          <Text fontSize="xl" fontWeight="bold" color="green.600">₱{discounted.due.toLocaleString()}</Text>
                          <Text fontSize="2xs" color="green.700" fontWeight="medium">
                            {getPromoDurationLabel(autoPromo!.durationPeriods, cycle)}
                          </Text>
                        </VStack>
                      ) : (
                        <Text fontSize="xl" fontWeight="bold" color="gray.800">{price}</Text>
                      )}
                      <Text fontSize="xs" color="gray.500" fontWeight="normal">{period}</Text>
                    </VStack>
                  </Th>
                )
              })}
            </Tr>
          </Thead>
          <Tbody>
            {PRICING_TIERS[0].rows.map(([label], rowIndex) => (
              <Tr key={label}>
                <Td fontWeight="medium" color="gray.700">{label}</Td>
                {PRICING_TIERS.map(tier => (
                  <Td key={tier.name} textAlign="center" bg={tier.popular ? 'primary.50' : undefined}>
                    {tier.rows[rowIndex][1]}
                  </Td>
                ))}
              </Tr>
            ))}
            <Tr>
              <Td></Td>
              {PRICING_TIERS.map(tier => (
                <Td key={tier.name} textAlign="center" bg={tier.popular ? 'primary.50' : undefined} borderBottomWidth={tier.popular ? 2 : 0} borderColor="primary.500">
                  {renderCta(tier, cycle)}
                </Td>
              ))}
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}
