'use client'

import { Card, CardBody, Stack, HStack, VStack, Text, Badge, Heading } from '@chakra-ui/react'
import { AccountSubscription } from '../types'

const STATUS_LABELS: Record<AccountSubscription['subscriptionStatus'], { label: string; colorScheme: string }> = {
  free: { label: 'Free', colorScheme: 'gray' },
  trialing: { label: 'Trial', colorScheme: 'blue' },
  active: { label: 'Active', colorScheme: 'green' },
  past_due: { label: 'Past Due', colorScheme: 'red' },
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function SubscriptionStatusCard({ subscription }: { subscription: AccountSubscription }) {
  const status = STATUS_LABELS[subscription.subscriptionStatus]
  const planLabel = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)

  return (
    <Card>
      <CardBody>
        <Stack spacing={3}>
          <HStack justify="space-between">
            <Heading size="md">{planLabel} Plan</Heading>
            <Badge colorScheme={status.colorScheme} fontSize="sm" px={2} py={1} borderRadius="md">
              {status.label}
            </Badge>
          </HStack>

          {subscription.subscriptionStatus === 'trialing' && subscription.trialEndsAt && (
            <Text color="blue.600">
              Your trial ends in {Math.max(0, daysUntil(subscription.trialEndsAt))} day(s), on {formatDate(subscription.trialEndsAt)}.
            </Text>
          )}

          {subscription.subscriptionStatus === 'active' && subscription.currentPeriodEnd && (
            <Text color="gray.600">
              Your plan is active through {formatDate(subscription.currentPeriodEnd)}.
            </Text>
          )}

          {subscription.subscriptionStatus === 'past_due' && (
            <VStack align="start" spacing={1}>
              <Text color="red.600" fontWeight="medium">
                Payment is due — new invoices and property listings can&apos;t be created, and your active listings are hidden from public search.
              </Text>
              <Text color="gray.600" fontSize="sm">
                Submit a payment below to restore access. If unpaid, your account will move to the Free plan.
              </Text>
            </VStack>
          )}

          {subscription.subscriptionStatus === 'free' && (
            <Text color="gray.600">Pick a plan below to start a 30-day free trial.</Text>
          )}
        </Stack>
      </CardBody>
    </Card>
  )
}
