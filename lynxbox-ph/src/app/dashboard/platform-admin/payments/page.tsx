'use client'

import { useState, useEffect, useCallback } from 'react'
import { Container, Box, Heading, Text, VStack, Spinner, useToast, Select, HStack } from '@chakra-ui/react'
import { paymentVerificationService } from '@/services/paymentVerificationService'
import { PaymentSubmission, PaymentSubmissionStatus } from '@/features/billing/types'
import PaymentSubmissionsQueue from '@/features/billing/components/PaymentSubmissionsQueue'

// docs/RBAC-Admin-Plan.md's "Planned deviation" — platform-admin's payment verification
// queue. No generateStaticParams split needed: no dynamic route, matching
// dashboard/platform-admin/page.tsx's own static summary page.
export default function PlatformAdminPaymentsPage() {
  const toast = useToast()
  const [status, setStatus] = useState<PaymentSubmissionStatus | 'all'>('pending')
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: PaymentSubmissionStatus | 'all') => {
    setLoading(true)
    try {
      const result = await paymentVerificationService.listSubmissions(s === 'all' ? undefined : s)
      setSubmissions(result)
    } catch {
      toast({ title: 'Failed to load payment submissions', status: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load(status)
  }, [status, load])

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Heading size="lg" mb={1}>Payment Verification</Heading>
            <Text color="gray.600">Review and verify manually-submitted payments</Text>
          </Box>
          <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentSubmissionStatus | 'all')} w="200px">
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </Select>
        </HStack>

        {loading ? (
          <Spinner />
        ) : (
          <PaymentSubmissionsQueue submissions={submissions} onChanged={() => load(status)} />
        )}
      </VStack>
    </Container>
  )
}
