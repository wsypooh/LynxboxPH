'use client';
import { useEffect, useState } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Spinner, useToast, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Input, Button,
} from '@chakra-ui/react';
import { tenantService } from '@/services/tenantService';
import { ChargeEntry, PaymentLedgerEntry } from '@/features/invoicing/types';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  gcash: 'GCash',
  credit_card: 'Credit Card',
  bank: 'Bank',
  online_banking: 'Online Banking',
};

interface Props {
  tenantId: string;
  penaltyEnabled?: boolean;
  reloadToken?: number;
}

export function LedgerView({ tenantId, penaltyEnabled = true, reloadToken }: Props) {
  const [charges, setCharges] = useState<ChargeEntry[]>([]);
  const [payments, setPayments] = useState<PaymentLedgerEntry[]>([]);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [asOf, setAsOf] = useState('');
  const [asOfInput, setAsOfInput] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const summary = await tenantService.getLedger(tenantId, asOfInput || undefined);
        setCharges(summary.charges);
        setPayments(summary.payments);
        setPreviousBalance(summary.previousBalance);
        setAsOf(summary.asOf);
      } catch (err: any) {
        toast({ title: 'Failed to load ledger', status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantId, reloadToken, asOfInput]);

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
        <HStack>
          <Text fontSize="xs" color="gray.500">Penalty calculated as of {asOf}</Text>
          <Input
            type="month" size="xs" w="130px" value={asOfInput}
            onChange={e => setAsOfInput(e.target.value)}
          />
          {asOfInput && (
            <Button size="xs" variant="ghost" onClick={() => setAsOfInput('')}>Reset to today</Button>
          )}
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
                  <Td><Badge colorScheme={c.source === 'import' ? 'purple' : 'blue'}>{c.source}</Badge></Td>
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
              </Tr>
            </Thead>
            <Tbody>
              {payments.length === 0 ? (
                <Tr>
                  <Td colSpan={5}>
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
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </VStack>
  );
}
