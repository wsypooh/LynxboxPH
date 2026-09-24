'use client'

import { Box, VStack, HStack, Stack, Text, Image, IconButton, Tooltip, useClipboard, useToast } from '@chakra-ui/react'
import { FiCopy } from 'react-icons/fi'
import { PaymentMethod } from '../types'
import { PAYMENT_METHOD_DETAILS } from '../paymentDetails'

function CopyableField({ label, value }: { label: string; value: string }) {
  const { onCopy } = useClipboard(value)
  const toast = useToast()

  return (
    <HStack justify="space-between" w="full">
      <Box>
        <Text fontSize="xs" color="gray.500">{label}</Text>
        <Text fontWeight="medium">{value}</Text>
      </Box>
      <Tooltip label="Copy">
        <IconButton
          aria-label={`Copy ${label}`}
          icon={<FiCopy />}
          size="xs"
          variant="ghost"
          onClick={() => {
            onCopy()
            toast({ title: `${label} copied`, status: 'success', duration: 1500 })
          }}
        />
      </Tooltip>
    </HStack>
  )
}

// Shown on the payment submission form so the customer knows where to actually send
// money before entering a reference number — this was previously missing entirely.
export default function PaymentReceivingDetails({ method }: { method: PaymentMethod }) {
  const details = PAYMENT_METHOD_DETAILS[method]
  const isEwallet = method === 'gcash' || method === 'maya'

  return (
    <Box borderWidth={1} borderColor="blue.200" bg="blue.50" borderRadius="md" p={4}>
      <VStack align="stretch" spacing={3}>
        <Text fontWeight="bold" fontSize="sm">Send payment to:</Text>

        <Stack direction={{ base: 'column', sm: 'row' }} align={{ base: 'center', sm: 'start' }} spacing={4}>
          {details.qrImage ? (
            <Image src={details.qrImage} alt={`${method} QR code`} boxSize="240px" borderRadius="md" bg="white" p={2} />
          ) : (
            <Box
              boxSize="240px"
              borderWidth={1}
              borderStyle="dashed"
              borderColor="gray.300"
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              p={2}
              bg="white"
            >
              <Text fontSize="xs" color="gray.400">QR code coming soon</Text>
            </Box>
          )}

          <VStack align="stretch" spacing={2} flex={1} w="full">
            {details.bankName && <CopyableField label="Bank" value={details.bankName} />}
            <CopyableField label="Account name" value={details.accountName} />
            <CopyableField label={isEwallet ? 'Mobile number' : 'Account number'} value={details.accountNumber} />
          </VStack>
        </Stack>
      </VStack>
    </Box>
  )
}
