'use client'

import { useState, useEffect } from 'react'
import {
  VStack, HStack, FormControl, FormLabel, Input, RadioGroup, Radio, Stack, Button,
  Text, Progress, useToast, Select, Box,
} from '@chakra-ui/react'
import { billingService } from '@/services/billingService'
import { validateDocumentFile } from '@/lib/utils'
import { PaidPlan, BillingCycle, PaymentMethod, PromoCode, AmountDue } from '../types'
import { calculateDisplayAmount, getPromoDurationLabel } from '../pricingMath'
import PaymentReceivingDetails from './PaymentReceivingDetails'

interface PaymentSubmissionFormProps {
  initialPlan: PaidPlan
  initialCycle?: BillingCycle
  onSubmitted: () => void
}

export default function PaymentSubmissionForm({ initialPlan, initialCycle = 'monthly', onSubmitted }: PaymentSubmissionFormProps) {
  const toast = useToast()
  const [plan, setPlan] = useState<PaidPlan>(initialPlan)
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle)
  const [method, setMethod] = useState<PaymentMethod>('gcash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [autoPromoCode, setAutoPromoCode] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState<string | null>(null) // set only after clicking "Apply"
  const [promoResult, setPromoResult] = useState<({ promo: PromoCode } & AmountDue) | null>(null)
  const [promoError, setPromoError] = useState('')
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activeCode = autoPromoCode || manualCode

  useEffect(() => {
    billingService.getActiveAutoApplyPromo().then(p => setAutoPromoCode(p?.code ?? null)).catch(() => {})
  }, [])

  // Re-validates against the real account (new-customers-only, applicablePlans, etc.)
  // whenever the code or the chosen plan/cycle changes — this is the same authoritative
  // check createPaymentSubmission applies for real, so what's shown here always matches
  // what will actually happen on submit. Covers both the auto-apply code and a manually
  // entered one through the same path, so they can't drift out of sync with each other.
  useEffect(() => {
    if (!activeCode) {
      setPromoResult(null)
      return
    }
    setValidatingPromo(true)
    billingService.validatePromoCode(activeCode, plan, cycle)
      .then(res => {
        setPromoResult(res)
        setPromoError('')
      })
      .catch((err: any) => {
        setPromoResult(null)
        // An auto-apply promo silently not applying (e.g. this account isn't a new
        // customer) isn't an error state — only surface one for a code the customer
        // deliberately typed in themselves.
        if (manualCode) {
          setPromoError(
            err.message?.includes('new customers')
              ? 'This promo code is only available to new customers.'
              : 'This promo code is not valid for this plan.'
          )
        }
      })
      .finally(() => setValidatingPromo(false))
  }, [activeCode, plan, cycle, manualCode])

  const amount = promoResult
    ? { base: promoResult.baseAmount, discount: promoResult.discountAmount, due: promoResult.amountDue }
    : calculateDisplayAmount(plan, cycle, null)

  const handleApplyPromo = () => {
    setPromoError('')
    if (!promoCodeInput.trim()) return
    setManualCode(promoCodeInput.trim())
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    const validation = validateDocumentFile(selected)
    if (!validation.isValid) {
      toast({ title: validation.error, status: 'error' })
      return
    }
    setFile(selected)
  }

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast({ title: 'Reference number is required', status: 'error' })
      return
    }
    if (!file) {
      toast({ title: 'Please attach proof of payment', status: 'error' })
      return
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const { uploadUrl, key } = await billingService.getUploadUrl(file.name, file.type)
      await billingService.uploadFile(uploadUrl, file, setUploadProgress)
      await billingService.createPaymentSubmission({
        requestedPlan: plan,
        requestedBillingCycle: cycle,
        method,
        referenceNumber: referenceNumber.trim(),
        amountClaimed: amount.due,
        promoCode: promoResult?.promo.code,
        proofS3Key: key,
        proofFileName: file.name,
      })
      toast({ title: 'Payment submitted', description: 'We\'ll verify it and activate your plan shortly.', status: 'success' })
      onSubmitted()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to submit payment', status: 'error' })
    } finally {
      setSubmitting(false)
      setUploadProgress(null)
    }
  }

  return (
    <VStack spacing={4} align="stretch">
      <FormControl>
        <FormLabel>Plan</FormLabel>
        <Select value={plan} onChange={(e) => setPlan(e.target.value as PaidPlan)}>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="business">Business</option>
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Billing cycle</FormLabel>
        <RadioGroup value={cycle} onChange={(v) => setCycle(v as BillingCycle)}>
          <Stack direction="row" spacing={6}>
            <Radio value="monthly">Monthly</Radio>
            <Radio value="annual">Annual (2 months free)</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>

      <Box p={3} bg="gray.50" borderRadius="md">
        {amount.discount > 0 && promoResult ? (
          <VStack align="start" spacing={0}>
            <HStack>
              <Text as="s" color="gray.500">₱{amount.base.toLocaleString()}</Text>
              <Text fontWeight="bold" color="green.600">₱{amount.due.toLocaleString()}</Text>
              <Text fontSize="sm" color="gray.500">({promoResult.promo.code})</Text>
            </HStack>
            <Text fontSize="xs" color="green.700" fontWeight="medium">
              {getPromoDurationLabel(promoResult.promo.durationPeriods, cycle)} — then ₱{amount.base.toLocaleString()}/{cycle === 'annual' ? 'yr' : 'mo'}
            </Text>
          </VStack>
        ) : (
          <Text fontWeight="bold">₱{amount.due.toLocaleString()}</Text>
        )}
      </Box>

      {!autoPromoCode && (
        <FormControl>
          <FormLabel>Promo code (optional)</FormLabel>
          <HStack>
            <Input value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)} placeholder="e.g. LAUNCH50" />
            <Button onClick={handleApplyPromo} variant="outline" isLoading={validatingPromo}>Apply</Button>
          </HStack>
          {promoError && <Text color="red.500" fontSize="sm" mt={1}>{promoError}</Text>}
        </FormControl>
      )}

      <FormControl>
        <FormLabel>Payment method</FormLabel>
        <RadioGroup value={method} onChange={(v) => setMethod(v as PaymentMethod)}>
          <Stack direction="row" spacing={6}>
            <Radio value="gcash">GCash</Radio>
            {/* Maya hidden for now — re-add <Radio value="maya">Maya</Radio> when ready */}
            <Radio value="bank_transfer">Bank Transfer</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>

      <PaymentReceivingDetails method={method} />

      <FormControl isRequired>
        <FormLabel>Reference number</FormLabel>
        <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Transaction/reference number" />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Proof of payment (image or PDF)</FormLabel>
        <Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileChange} p={1} />
      </FormControl>

      {uploadProgress !== null && <Progress value={uploadProgress} size="sm" borderRadius="md" />}

      <Button colorScheme="primary" alignSelf="flex-start" onClick={handleSubmit} isLoading={submitting} loadingText="Submitting...">
        Submit Payment
      </Button>
    </VStack>
  )
}
