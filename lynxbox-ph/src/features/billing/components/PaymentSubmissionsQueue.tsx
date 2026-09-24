'use client'

import { useState } from 'react'
import {
  Table, Thead, Tbody, Tr, Th, Td, HStack, IconButton, Tooltip, Badge, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Textarea, Button, Text,
} from '@chakra-ui/react'
import { FiEye, FiCheck, FiX } from 'react-icons/fi'
import { paymentVerificationService } from '@/services/paymentVerificationService'
import { PaymentSubmission, PAYMENT_METHOD_LABELS } from '@/features/billing/types'

// Row actions are icon-only IconButtons wrapped in Tooltip, matching DocumentList/InvoiceList
// convention. "View proof" opens a presigned URL in a new tab, same as DocumentList's view
// action — no separate detail page/route needed for this.
export default function PaymentSubmissionsQueue({
  submissions,
  onChanged,
}: {
  submissions: PaymentSubmission[]
  onChanged: () => void
}) {
  const toast = useToast()
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmission | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const handleView = async (id: string) => {
    try {
      const url = await paymentVerificationService.getProofViewUrl(id)
      window.open(url, '_blank')
    } catch (err: any) {
      toast({ title: err.message || 'Failed to open proof', status: 'error' })
    }
  }

  const handleApprove = async (id: string) => {
    setBusyId(id)
    try {
      await paymentVerificationService.approveSubmission(id)
      toast({ title: 'Payment approved', status: 'success' })
      onChanged()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to approve', status: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setBusyId(rejectTarget.id)
    try {
      await paymentVerificationService.rejectSubmission(rejectTarget.id, rejectReason || 'Payment could not be verified.')
      toast({ title: 'Payment rejected', status: 'info' })
      setRejectTarget(null)
      setRejectReason('')
      onChanged()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to reject', status: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  if (submissions.length === 0) {
    return <Text color="gray.500">No pending payment submissions.</Text>
  }

  return (
    <>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Account</Th>
            <Th>Plan</Th>
            <Th>Method</Th>
            <Th>Reference</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {submissions.map(s => (
            <Tr key={s.id}>
              <Td>{new Date(s.submittedAt).toLocaleDateString('en-PH')}</Td>
              <Td>{s.accountEmail || s.accountId}</Td>
              <Td>{s.requestedPlan} ({s.requestedBillingCycle})</Td>
              <Td>{PAYMENT_METHOD_LABELS[s.method]}</Td>
              <Td>{s.referenceNumber}</Td>
              <Td>₱{s.amountClaimed.toLocaleString()} <Text as="span" color="gray.500" fontSize="xs">(expected ₱{s.amountExpected.toLocaleString()})</Text></Td>
              <Td><Badge colorScheme={s.status === 'pending' ? 'yellow' : s.status === 'verified' ? 'green' : 'red'}>{s.status}</Badge></Td>
              <Td>
                <HStack spacing={1}>
                  <Tooltip label="View proof">
                    <IconButton aria-label="View proof" icon={<FiEye />} size="xs" variant="outline" onClick={() => handleView(s.id)} />
                  </Tooltip>
                  {s.status === 'pending' && (
                    <>
                      <Tooltip label="Approve">
                        <IconButton
                          aria-label="Approve payment"
                          icon={<FiCheck />}
                          size="xs"
                          variant="outline"
                          colorScheme="green"
                          isLoading={busyId === s.id}
                          onClick={() => handleApprove(s.id)}
                        />
                      </Tooltip>
                      <Tooltip label="Reject">
                        <IconButton
                          aria-label="Reject payment"
                          icon={<FiX />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => setRejectTarget(s)}
                        />
                      </Tooltip>
                    </>
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reject Payment Submission</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (shown to the customer)"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button colorScheme="red" onClick={handleReject} isLoading={busyId === rejectTarget?.id}>Reject</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
