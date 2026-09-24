'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container, Box, Heading, Text, VStack, Spinner, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Card, CardBody, Button, Alert, AlertIcon, Tooltip,
  AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from '@chakra-ui/react'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccount } from '@/features/account/AccountContext'
import { billingService } from '@/services/billingService'
import { AccountSubscription, PaymentSubmission, PaidPlan, BillingCycle, PAYMENT_METHOD_LABELS } from '@/features/billing/types'
import SubscriptionStatusCard from '@/features/billing/components/SubscriptionStatusCard'
import PaymentSubmissionForm from '@/features/billing/components/PaymentSubmissionForm'
import PricingComparisonTable, { PricingTier } from '@/features/billing/components/PricingComparisonTable'

const SUBMISSION_STATUS_COLOR: Record<PaymentSubmission['status'], string> = {
  pending: 'yellow',
  verified: 'green',
  rejected: 'red',
}

export default function BillingPage() {
  const { user, isLoading } = useAuth()
  const { canManageBilling } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isDowngradeOpen, onOpen: onDowngradeOpen, onClose: onDowngradeClose } = useDisclosure()
  const downgradeCancelRef = useRef<HTMLButtonElement>(null)

  const [subscription, setSubscription] = useState<AccountSubscription | null>(null)
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [startingTrial, setStartingTrial] = useState(false)
  const [downgrading, setDowngrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>('starter')
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly')

  const load = useCallback(async () => {
    const [status, history] = await Promise.all([
      billingService.getStatus(),
      billingService.listPaymentSubmissions(),
    ])
    setSubscription(status)
    setSubmissions(history)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.userId) return
    setLoading(true)
    load().catch(() => toast({ title: 'Failed to load billing information', status: 'error' })).finally(() => setLoading(false))
  }, [user?.userId, load, toast])

  const queryPlan = searchParams.get('plan') as PaidPlan | null
  const queryCycle = searchParams.get('cycle')

  const handleStartTrial = async (plan: PaidPlan, cycle: BillingCycle = 'monthly') => {
    setStartingTrial(true)
    try {
      const updated = await billingService.startTrial(plan, cycle)
      setSubscription(updated)
      toast({ title: `Your 30-day trial of ${plan} has started!`, status: 'success' })
    } catch (err: any) {
      toast({ title: err.message || 'Failed to start trial', status: 'error' })
    } finally {
      setStartingTrial(false)
    }
  }

  const openPaymentForm = (plan: PaidPlan, cycle: BillingCycle = 'monthly') => {
    setSelectedPlan(plan)
    setSelectedCycle(cycle)
    onOpen()
  }

  const handleSubmitted = () => {
    onClose()
    load()
  }

  // Previously the only paths to Free were letting a paid period lapse (which goes
  // through the punitive past_due state first) or a platform-admin manual override —
  // this is the actual self-serve "Downgrade to Free" action, immediate and voluntary.
  const handleDowngrade = async () => {
    setDowngrading(true)
    try {
      const updated = await billingService.downgradeToFree()
      setSubscription(updated)
      toast({ title: 'Your account is now on the Free plan', status: 'info' })
      onDowngradeClose()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to downgrade', status: 'error' })
    } finally {
      setDowngrading(false)
    }
  }

  const renderCta = (tier: PricingTier, cycle: BillingCycle) => {
    if (!subscription) return null
    const isCurrent = tier.slug === subscription.plan
    if (isCurrent) {
      return <Button size="sm" w="full" isDisabled variant="outline">Current Plan</Button>
    }

    if (tier.slug === 'free') {
      const button = (
        <Button
          size="sm"
          w="full"
          variant="outline"
          colorScheme="red"
          isDisabled={!canManageBilling}
          onClick={canManageBilling ? onDowngradeOpen : undefined}
        >
          Downgrade
        </Button>
      )
      if (canManageBilling) return button
      return (
        <Tooltip label="Only the account owner can manage billing">
          <Box tabIndex={0}>{button}</Box>
        </Tooltip>
      )
    }

    const isStartTrial = !subscription.hasUsedTrial
    const button = (
      <Button
        size="sm"
        w="full"
        colorScheme="primary"
        variant={isStartTrial ? 'solid' : 'outline'}
        isDisabled={!canManageBilling}
        isLoading={isStartTrial ? startingTrial : undefined}
        onClick={canManageBilling ? () => (isStartTrial ? handleStartTrial(tier.slug as PaidPlan, cycle) : openPaymentForm(tier.slug as PaidPlan, cycle)) : undefined}
      >
        {isStartTrial ? 'Start Trial' : 'Switch Plan'}
      </Button>
    )

    // Only the account owner can manage billing (api/src/lib/auth.ts's
    // canManageBilling) — other roles see the same button, disabled, with a tooltip
    // explaining why, rather than a 403 on click.
    if (canManageBilling) return button
    return (
      <Tooltip label="Only the account owner can manage billing">
        {/* A disabled Button suppresses pointer events entirely, so Tooltip's hover
            trigger needs a non-disabled wrapper to actually fire on. */}
        <Box tabIndex={0}>{button}</Box>
      </Tooltip>
    )
  }

  if (isLoading || loading) {
    return (
      <Container maxW="container.xl" py={8} display="flex" justifyContent="center" alignItems="center" minH="60vh">
        <Spinner size="xl" />
      </Container>
    )
  }

  if (!user || !subscription) return null

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={1}>Billing</Heading>
          <Text color="gray.600">Manage your Lynxbox PH plan and payments</Text>
        </Box>

        <SubscriptionStatusCard subscription={subscription} />

        {!canManageBilling && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            Only the account owner can manage billing and submit payments. Contact your account owner to change plans or make a payment.
          </Alert>
        )}

        {canManageBilling && queryPlan && !subscription.hasUsedTrial && subscription.subscriptionStatus === 'free' && (
          <Card borderColor="primary.400" borderWidth={2}>
            <CardBody>
              <VStack align="start" spacing={3}>
                <Heading size="sm">Start your 30-day free trial of {queryPlan.charAt(0).toUpperCase() + queryPlan.slice(1)}</Heading>
                <Text color="gray.600">No payment required to start — you can submit payment anytime during or after your trial.</Text>
                <Button colorScheme="primary" onClick={() => handleStartTrial(queryPlan)} isLoading={startingTrial}>
                  Start Trial
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        {canManageBilling && (subscription.subscriptionStatus === 'past_due' || subscription.hasUsedTrial) && (
          <Card>
            <CardBody>
              <Heading size="sm" mb={3}>Submit a Payment</Heading>
              <PaymentSubmissionForm
                initialPlan={subscription.plan !== 'free' ? (subscription.plan as PaidPlan) : 'starter'}
                onSubmitted={handleSubmitted}
              />
            </CardBody>
          </Card>
        )}

        <Box>
          <Heading size="md" mb={4}>Compare Plans</Heading>
          <PricingComparisonTable renderCta={renderCta} />
        </Box>

        <Box>
          <Heading size="md" mb={4}>Payment History</Heading>
          {submissions.length === 0 ? (
            <Text color="gray.500">No payment submissions yet.</Text>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Plan</Th>
                    <Th>Method</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {submissions.map(s => (
                    <Tr key={s.id}>
                      <Td>{new Date(s.submittedAt).toLocaleDateString('en-PH')}</Td>
                      <Td>{s.requestedPlan} ({s.requestedBillingCycle})</Td>
                      <Td>{PAYMENT_METHOD_LABELS[s.method]}</Td>
                      <Td>₱{s.amountClaimed.toLocaleString()}</Td>
                      <Td><Badge colorScheme={SUBMISSION_STATUS_COLOR[s.status]}>{s.status}</Badge></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Submit Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <PaymentSubmissionForm initialPlan={selectedPlan} initialCycle={selectedCycle} onSubmitted={handleSubmitted} />
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDowngradeOpen} leastDestructiveRef={downgradeCancelRef} onClose={onDowngradeClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Downgrade to Free?</AlertDialogHeader>
            <AlertDialogBody>
              Your plan will switch to Free immediately. Your data is safe — nothing is deleted — but any property
              listings beyond the Free plan&apos;s limit will be unlisted (you can choose which to re-list if you
              upgrade again).
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={downgradeCancelRef} onClick={onDowngradeClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDowngrade} isLoading={downgrading} ml={3}>
                Downgrade to Free
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  )
}
