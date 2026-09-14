'use client';
import { useState } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Text, Divider, HStack, Button } from '@chakra-ui/react';
import { Invoice } from '@/features/invoicing/types';
import { invoiceService } from '@/services/invoiceService';

interface Props {
  invoice: Invoice;
}

function fmt(n: number) {
  return (n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length === 10 && d.startsWith('02')) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 12 && d.startsWith('63')) return `+63 ${d.slice(2, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

export function StatementOfAccount({ invoice }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await invoiceService.downloadPdf(invoice.id, invoice.invoiceNumber, invoice.tenantCode);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>
      <Box maxW="720px" mx="auto" p={6} bg="white" id="statement-of-account">
        {/* Header */}
        <Box bg="#0e2949" color="white" p={5} mb={4} borderRadius="md" textAlign="center">
          <Text fontWeight="bold" fontSize="2xl">{invoice.buildingName}</Text>
          <Text fontSize="sm">{invoice.buildingAddress}</Text>
          {invoice.buildingPhone && <Text fontSize="sm">Tel: {formatPhone(invoice.buildingPhone)}</Text>}
          {invoice.buildingEmail && <Text fontSize="sm">Email: {invoice.buildingEmail}</Text>}
        </Box>

        <Text fontWeight="bold" fontSize="lg" textAlign="center" mb={1}>STATEMENT OF ACCOUNT</Text>
        <Text textAlign="center" mb={4}>For the Month of {invoice.billingLabel}</Text>

        <HStack justify="space-between" mb={2} fontSize="sm">
          <Box><b>Lessee:</b> {invoice.lesseeName}</Box>
          <Box><b>Invoice #:</b> {invoice.invoiceNumber}</Box>
        </HStack>
        <HStack justify="space-between" mb={4} fontSize="sm">
          <Box><b>Door No.:</b> {invoice.floor} {invoice.roomNumber}</Box>
          <Box><b>Lessee No.:</b> {invoice.tenantCode}</Box>
        </HStack>

        {/* Current Charges */}
        <HStack justify="space-between" bg="#0e2949" color="white" px={3} py={1} mb={0}>
          <Text fontWeight="bold">Current Charges</Text>
          <Text fontWeight="bold">Amount</Text>
        </HStack>
        <Table size="sm" variant="simple" mb={4}>
          <Tbody>
            <Tr><Td>Rent</Td><Td isNumeric>{fmt(invoice.rent)}</Td></Tr>
            {invoice.vat !== 0 && <Tr><Td>VAT (12%)</Td><Td isNumeric>{fmt(invoice.vat)}</Td></Tr>}
            {invoice.withholdingTax !== 0 && (
              <Tr><Td>Less: Withholding Tax (5%)</Td><Td isNumeric>({fmt(Math.abs(invoice.withholdingTax))})</Td></Tr>
            )}
            <Tr bg="gray.50" fontWeight="bold"><Td>Subtotal</Td><Td isNumeric>{fmt(invoice.subtotal)}</Td></Tr>
            {invoice.water.amount > 0 && (
              <Tr>
                <Td>
                  {invoice.water.presentReading !== undefined || invoice.water.previousReading !== undefined
                    ? `Water (${invoice.water.presentReading} − ${invoice.water.previousReading} = ${Math.max(0, (invoice.water.presentReading ?? 0) - (invoice.water.previousReading ?? 0))} m³ × ₱${invoice.water.rate})`
                    : 'Water (Fixed)'}
                </Td>
                <Td isNumeric>{fmt(invoice.water.amount)}</Td>
              </Tr>
            )}
            {invoice.electricity.mode !== 'direct' && (
              <Tr>
                <Td>Electricity ({invoice.electricity.presentReading} − {invoice.electricity.previousReading} = {Math.max(0, (invoice.electricity.presentReading || 0) - (invoice.electricity.previousReading || 0))} kWh × ₱{invoice.electricity.rate})</Td>
                <Td isNumeric>{fmt(invoice.electricity.amount)}</Td>
              </Tr>
            )}
            {invoice.guard > 0 && <Tr><Td>Guard</Td><Td isNumeric>{fmt(invoice.guard)}</Td></Tr>}
            {invoice.otherCharges.map((oc, i) => (
              <Tr key={i}><Td>{oc.description}</Td><Td isNumeric>{fmt(oc.amount)}</Td></Tr>
            ))}
            {invoice.discount > 0 && <Tr><Td>Discount</Td><Td isNumeric>({fmt(invoice.discount)})</Td></Tr>}
            <Tr bg="blue.50" fontWeight="bold">
              <Td>Total Current Charges</Td><Td isNumeric>{fmt(invoice.currentChargesTotal)}</Td>
            </Tr>
          </Tbody>
        </Table>

        {/* Previous Balance */}
        {invoice.previousBalanceHistory && invoice.previousBalanceHistory.length > 0 && (
          <>
            <Text fontWeight="bold" bg="#0e2949" color="white" px={3} py={1} mb={0}>Previous Balance</Text>
            <Table size="sm" variant="simple" mb={4}>
              <Thead>
                <Tr>
                  <Th>Invoice #</Th><Th>Period</Th><Th isNumeric>Due</Th>
                  <Th isNumeric>Paid</Th><Th isNumeric>Outstanding</Th><Th isNumeric>Penalty</Th>
                </Tr>
              </Thead>
              <Tbody>
                {invoice.previousBalanceHistory.map((e, i) => (
                  <Tr key={i}>
                    <Td>{e.invoiceNumber}</Td><Td>{e.billingLabel}</Td>
                    <Td isNumeric>{fmt(e.amountDue)}</Td>
                    <Td isNumeric>{fmt(e.amountPaid)}</Td>
                    <Td isNumeric>{fmt(e.outstanding)}</Td>
                    <Td isNumeric>{fmt(e.penalty)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </>
        )}

        {/* Totals */}
        <Box border="1px" borderColor="gray.200" p={3} borderRadius="md">
          <HStack justify="space-between" fontSize="sm">
            <Text>Previous Balance</Text><Text>{fmt(invoice.previousBalance)}</Text>
          </HStack>
          <Divider my={2} />
          <HStack justify="space-between" fontWeight="bold" fontSize="lg" color="#0e2949">
            <Text>TOTAL DUE</Text><Text>₱{fmt(invoice.totalDue)}</Text>
          </HStack>
          {invoice.amountPaid > 0 && (
            <>
              <HStack justify="space-between" fontSize="sm" color="green.600">
                <Text>Amount Paid</Text><Text>{fmt(invoice.amountPaid)}</Text>
              </HStack>
              <HStack justify="space-between" fontWeight="bold" color={invoice.outstanding <= 0 ? 'green.600' : 'red.600'}>
                <Text>Balance Outstanding</Text><Text>PHP {fmt(invoice.outstanding)}</Text>
              </HStack>
            </>
          )}
        </Box>

        <Button mt={4} colorScheme="blue" size="sm" className="no-print" isLoading={downloading} onClick={handleDownload}>
          Download PDF
        </Button>
      </Box>
    </>
  );
}
