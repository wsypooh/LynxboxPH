'use client'

import { useState, useEffect, useCallback } from 'react'
import { Container, Box, Heading, Text, VStack, Spinner, useToast } from '@chakra-ui/react'
import { paymentVerificationService } from '@/services/paymentVerificationService'
import { PromoCode } from '@/features/billing/types'
import PromoCodeManager from '@/features/billing/components/PromoCodeManager'

export default function PlatformAdminPromoCodesPage() {
  const toast = useToast()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await paymentVerificationService.listPromoCodes()
      setCodes(result)
    } catch {
      toast({ title: 'Failed to load promo codes', status: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={1}>Promo Codes</Heading>
          <Text color="gray.600">Create and manage discount codes for new subscriptions</Text>
        </Box>

        {loading ? <Spinner /> : <PromoCodeManager codes={codes} onChanged={load} />}
      </VStack>
    </Container>
  )
}
