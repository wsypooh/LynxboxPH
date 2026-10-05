'use client';
import { useEffect, useState } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Spinner, useToast, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Input, Button, IconButton, Tooltip, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel,
} from '@chakra-ui/react';
import { FiEdit2, FiSlash } from 'react-icons/fi';
import { tenantService } from '@/services/tenantService';
import { useAccount } from '@/features/account/AccountContext';
import { ChargeEntry, PaymentLedgerEntry } from '@/features/invoicing/types';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  gcash: 'GCash',
  credit_card: 'Credit Card',
  bank: 'Bank',
  online_banking: 'Online Banking',
  other: 'Other',
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'gcash', label: 'GCash' },
  { value: 'online_banking', label: 'Online Banking' },
  { value: 'other', label: 'Other' },
];

interface Props {
  tenantId: string;
  penaltyEnabled?: boolean;
  reloadToken?: number;
}

export function LedgerView({ tenantId, penaltyEnabled = true, reloadToken }: Props) {
  const { canDestroy } = useAccount();
  const [charges, setCharges] = useState<ChargeEntry[]>([]);
  const [payments, setPayments] = useState<PaymentLedgerEntry[]>([]);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<PaymentLedgerEntry | null>(null);
  const [editMethod, setEditMethod] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const summary = await tenantService.getLedger(tenantId);
      setCharges(summary.charges);
      setPayments(summary.payments);
      setPreviousBalance(summary.previousBalance);
    } catch (err: any) {
      toast({ title: 'Failed to load ledger', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, reloadToken]);

  const openEdit = (p: PaymentLedgerEntry) => {
    setEditingPayment(p);
    setEditMethod(p.paymentMethod);
    setEditNote(p.note ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;
    setSavingEdit(true);
    try {
      await tenantService.editLedgerPayment(tenantId, editingPayment.id, {
        paymentMethod: editMethod, note: editNote,
      });
      toast({ title: 'Payment updated', status: 'success' });
      setEditingPayment(null);
      await load();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update payment', status: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleVoid = async (p: PaymentLedgerEntry) => {
    if (!confirm(
      `Void this ₱${p.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} payment? ` +
      'This reverses it from every charge it was applied to, as if it never happened -- use this ' +
      'to correct a wrong amount, then record a new payment with the right one.'
    )) return;
    try {
      await tenantService.voidLedgerPayment(tenantId, p.id);
      toast({ title: 'Payment voided', status: 'info' });
      await load();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to void payment', status: 'error' });
    }
  };

  if (loading) return <Spinner size="sm" />;

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <HStack>
          <Text fontSize="sm" color="gray.500">Outstanding balance{penaltyEnabled ? ' (incl. penalties)' : ''}:</Text>
          <Badge colorScheme={previousBalance > 0 ? 'red' : 'green'} fontSize="sm" px={2} py={1}>
            ₱{previousBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Badge>
        </HStack>
      </HStack>

      <Box>
        <Text fontWeight="semibold" fontSize="sm" mb={2}>Charges</Text>
        <TableContainer borderWidth={1} borderRadius="md">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Billing Month</Th>
                <Th>Description</Th>
                <Th>Source</Th>
                <Th isNumeric>Principal</Th>
                <Th isNumeric>Outstanding</Th>
                {penaltyEnabled && <Th isNumeric>Penalty</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {charges.length === 0 ? (
                <Tr>
                  <Td colSpan={penaltyEnabled ? 6 : 5}>
                    <Text color="gray.500" fontSize="sm">No charges yet.</Text>
                  </Td>
                </Tr>
              ) : charges.map(c => (
                <Tr key={c.id} bg={c.principalOutstanding > 0 ? 'red.50' : undefined}>
                  <Td>{c.billingMonth}</Td>
                  <Td fontSize="xs">{c.description}</Td>
                  <Td>
                    <HStack spacing={1}>
                      <Badge colorScheme={c.source === 'import' ? 'purple' : 'blue'}>{c.source}</Badge>
                      {c.waived && <Badge colorScheme="gray">waived</Badge>}
                    </HStack>
                  </Td>
                  <Td isNumeric>₱{c.principalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                  <Td isNumeric>₱{c.principalOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                  {penaltyEnabled && (
                    <Td isNumeric>₱{(c.pendingPenalty ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Text fontWeight="semibold" fontSize="sm" mb={2}>Payments</Text>
        <TableContainer borderWidth={1} borderRadius="md">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Date</Th>
                <Th isNumeric>Amount</Th>
                <Th>Method</Th>
                <Th>Note</Th>
                <Th isNumeric>Charges Applied</Th>
                {canDestroy && <Th>Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {payments.length === 0 ? (
                <Tr>
                  <Td colSpan={canDestroy ? 6 : 5}>
                    <Text color="gray.500" fontSize="sm">No payments recorded yet.</Text>
                  </Td>
                </Tr>
              ) : payments.map(p => (
                <Tr key={p.id}>
                  <Td>{p.paymentDate}</Td>
                  <Td isNumeric>₱{p.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                  <Td>{PAYMENT_METHOD_LABELS[p.paymentMethod] || '—'}</Td>
                  <Td fontSize="xs">{p.note || '—'}</Td>
                  <Td isNumeric>{p.appliedTo.length}</Td>
                  {canDestroy && (
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label="Edit payment">
                          <IconButton aria-label="Edit payment" icon={<FiEdit2 />} size="xs" variant="ghost" onClick={() => openEdit(p)} />
                        </Tooltip>
                        <Tooltip label="Void payment">
                          <IconButton aria-label="Void payment" icon={<FiSlash />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleVoid(p)} />
                        </Tooltip>
                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Modal isOpen={!!editingPayment} onClose={() => setEditingPayment(null)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Only the method and note can be changed here — the amount and date are left as
                recorded, since those drive FIFO allocation and penalty calculations.
              </Text>
              <FormControl>
                <FormLabel fontSize="sm">Payment Method</FormLabel>
                <Select value={editMethod} onChange={e => setEditMethod(e.target.value)}>
                  {PAYMENT_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Note</FormLabel>
                <Input value={editNote} onChange={e => setEditNote(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={() => setEditingPayment(null)} isDisabled={savingEdit}>Cancel</Button>
              <Button colorScheme="blue" onClick={handleSaveEdit} isLoading={savingEdit}>Save</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
