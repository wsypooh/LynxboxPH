'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Heading, Text, VStack, HStack, Badge, Button, Card, CardBody, CardHeader,
  useToast, Spinner, Table, Thead, Tbody, Tr, Th, Td,
} from '@chakra-ui/react';
import { tenantService } from '@/services/tenantService';
import { buildingService } from '@/services/buildingService';
import { InvoiceList } from '@/features/invoicing/components/InvoiceList';
import { Tenant, Building, Invoice } from '@/features/invoicing/types';

export default function TenantDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, invs] = await Promise.all([
          tenantService.getTenant(id),
          tenantService.listInvoicesByTenant(id),
        ]);
        setTenant(t);
        setInvoices(invs);
        if (t.buildingId) {
          const b = await buildingService.getBuilding(t.buildingId);
          setBuilding(b);
        }
      } catch (err: any) {
        toast({ title: 'Failed to load tenant', status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Box p={6}><Spinner /></Box>;
  if (!tenant) return <Box p={6}><Text>Tenant not found.</Text></Box>;

  return (
    <Box p={6}>
      <HStack mb={4}>
        <Button variant="ghost" onClick={() => router.back()}>← Back</Button>
        <Heading size="lg">{tenant.lesseeName}</Heading>
        <Badge colorScheme={tenant.status === 'active' ? 'green' : 'gray'} ml={2}>{tenant.status}</Badge>
      </HStack>

      <VStack align="stretch" spacing={4}>
        <Card>
          <CardHeader pb={1}><Heading size="sm">Unit &amp; Contact</Heading></CardHeader>
          <CardBody>
            <HStack spacing={8} flexWrap="wrap">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Building</Text>
                <Text fontWeight="medium">{building?.name || tenant.buildingId}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Unit</Text>
                <Text fontWeight="medium">{tenant.floor} {tenant.roomNumber}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Area</Text>
                <Text fontWeight="medium">{tenant.area} sqm</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Lessee No.</Text>
                <Text fontFamily="mono">{tenant.tenantCode}</Text>
              </VStack>
              {tenant.contactEmail && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Email</Text>
                  <Text>{tenant.contactEmail}</Text>
                </VStack>
              )}
              {tenant.contactPhone && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Phone</Text>
                  <Text>{tenant.contactPhone}</Text>
                </VStack>
              )}
              {tenant.tin && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">TIN</Text>
                  <Text>{tenant.tin}</Text>
                </VStack>
              )}
            </HStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb={1}><Heading size="sm">Billing Defaults</Heading></CardHeader>
          <CardBody>
            <HStack spacing={8} flexWrap="wrap">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Default Rent</Text>
                <Text fontWeight="medium">₱{tenant.defaultRent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">VAT</Text>
                <Badge colorScheme={tenant.vatEnabled ? 'green' : 'gray'}>
                  {tenant.vatEnabled ? 'Enabled (12%)' : 'Disabled'}
                </Badge>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Withholding Tax</Text>
                <Badge colorScheme={tenant.withholdingTaxEnabled ? 'green' : 'gray'}>
                  {tenant.withholdingTaxEnabled ? 'Enabled (5%)' : 'Disabled'}
                </Badge>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Water</Text>
                <Text>
                  {tenant.waterMode === 'metered'
                    ? `Metered (₱${tenant.defaultWaterRate}/m³)`
                    : `Fixed (₱${tenant.defaultFixedWater})`}
                </Text>
              </VStack>
              {(tenant.defaultGuard ?? 0) > 0 && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Guard</Text>
                  <Text>₱{(tenant.defaultGuard ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                </VStack>
              )}
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Penalty</Text>
                <Text color={(tenant.penaltyEnabled ?? true) ? 'green.600' : 'red.500'}>
                  {(tenant.penaltyEnabled ?? true) ? 'Enabled' : 'Disabled'}
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {tenant.contracts && tenant.contracts.length > 0 && (
          <Card>
            <CardHeader pb={1}><Heading size="sm">Contract History</Heading></CardHeader>
            <CardBody>
              <Table size="sm">
                <Thead>
                  <Tr><Th>Start</Th><Th>End</Th><Th isNumeric>Rent</Th><Th isNumeric>Deposit</Th><Th>Notes</Th></Tr>
                </Thead>
                <Tbody>
                  {tenant.contracts.map((c, i) => (
                    <Tr key={i} bg={i === tenant.contracts.length - 1 ? 'blue.50' : undefined}>
                      <Td>{c.startDate}</Td>
                      <Td>{c.endDate}</Td>
                      <Td isNumeric>₱{c.rentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                      <Td isNumeric>₱{c.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                      <Td>{c.notes || '—'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader pb={1}>
            <HStack justify="space-between">
              <Heading size="sm">Invoices</Heading>
              <Button size="sm" colorScheme="blue" onClick={() => router.push(`/dashboard/invoices/new?tenantId=${id}`)}>
                + New Invoice
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <InvoiceList
              invoices={invoices}
              selectedIds={new Set()}
              onToggle={() => {}}
              onToggleAll={() => {}}
            />
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
