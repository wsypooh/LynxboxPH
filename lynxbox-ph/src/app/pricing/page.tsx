'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import PricingComparisonTable from '@/features/billing/components/PricingComparisonTable'
import PricingCtaButton from '@/features/billing/components/PricingCtaButton'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccount } from '@/features/account/AccountContext'
import { billingService } from '@/services/billingService'
import { Plan } from '@/features/billing/types'
import { useState, useEffect } from 'react'

// Standalone pricing page — fixes the dashboard's "Upgrade Now" banner link, which
// pointed here before this route existed. Reuses the exact same tier data/table as the
// homepage's #pricing section (docs/Payments-and-Subscription-Plan.md).
export default function PricingPage() {
  const { user } = useAuth()
  const { canManageBilling } = useAccount()
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)

  useEffect(() => {
    if (!user) return
    billingService.getStatus().then(s => setCurrentPlan(s.plan)).catch(() => {})
  }, [user])

  return (
    <Box bg="gray.50" py={20} as="main">
      <Container maxW="container.xl">
        <VStack spacing={12}>
          <VStack spacing={4} textAlign="center">
            <Heading size="xl">Simple, Transparent Pricing</Heading>
            <Text fontSize="lg" color="gray.600">
              Start free and upgrade as you grow
            </Text>
            <Text fontSize="md" color="green.600" fontWeight="medium">
              No credit card required to sign up or start your 30-day free trial
            </Text>
            <Text fontSize="sm" color="gray.500" maxW="2xl">
              Every plan includes the full ledger (FIFO payments &amp; penalty automation), automatic VAT/EWT computation with PDF Statements of Account, and CSV import for tenants &amp; ledger history.
            </Text>
          </VStack>

          <PricingComparisonTable
            renderCta={(tier, cycle) => (
              <PricingCtaButton tier={tier} cycle={cycle} isLoggedIn={!!user} currentPlan={currentPlan} canManageBilling={canManageBilling} />
            )}
          />
        </VStack>
      </Container>
    </Box>
  )
}
