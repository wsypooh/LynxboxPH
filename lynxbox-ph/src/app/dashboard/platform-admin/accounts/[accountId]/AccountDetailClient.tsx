'use client';
import { useState, useEffect } from 'react';
import {
  Box, Heading, Text, Spinner, useToast, SimpleGrid, Card, CardHeader, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge,
} from '@chakra-ui/react';
import { platformAdminService } from '@/services/platformAdminService';
import { AccountDetail } from '@/features/platform-admin/types';

function formatCurrency(amount: number): string {
  return (amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

export default function AccountDetailClient({ accountId }: { accountId: string }) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!accountId) return;
    platformAdminService.getAccountDetail(accountId)
      .then(setDetail)
      .catch(() => toast({ title: 'Failed to load account', status: 'error' }))
      .finally(() => setLoading(false));
  }, [accountId, toast]);

  if (loading) {
    return (
      <Box p={8}>
        <Spinner />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Box p={8}>
        <Text>Account not found.</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Heading size="lg" mb={1}>Account: {detail.ownerEmail || detail.accountId}</Heading>
      <Text color="gray.500" mb={6}>
        Read-only view &mdash; platform admin cannot edit this account&apos;s data.
      </Text>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
        <Card>
          <CardHeader pb={0}><Text fontSize="sm" color="gray.500">Properties</Text></CardHeader>
          <CardBody pt={1}><Heading size="md">{detail.properties.length}</Heading></CardBody>
        </Card>
        <Card>
          <CardHeader pb={0}><Text fontSize="sm" color="gray.500">Buildings</Text></CardHeader>
          <CardBody pt={1}><Heading size="md">{detail.buildings.length}</Heading></CardBody>
        </Card>
        <Card>
          <CardHeader pb={0}><Text fontSize="sm" color="gray.500">Tenants</Text></CardHeader>
          <CardBody pt={1}><Heading size="md">{detail.tenants.length}</Heading></CardBody>
        </Card>
        <Card>
          <CardHeader pb={0}><Text fontSize="sm" color="gray.500">Documents</Text></CardHeader>
          <CardBody pt={1}><Heading size="md">{detail.documents.length}</Heading></CardBody>
        </Card>
      </SimpleGrid>

      <Heading size="md" mb={3}>Tenants</Heading>
      <Table variant="simple" mb={8}>
        <Thead>
          <Tr><Th>Code</Th><Th>Name</Th><Th>Status</Th></Tr>
        </Thead>
        <Tbody>
          {detail.tenants.map(t => (
            <Tr key={t.id}>
              <Td>{t.tenantCode}</Td>
              <Td>{t.lesseeName}</Td>
              <Td><Badge>{t.status}</Badge></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Heading size="md" mb={3}>Invoices</Heading>
      <Table variant="simple">
        <Thead>
          <Tr><Th>Invoice #</Th><Th>Billing Month</Th><Th isNumeric>Total Due</Th><Th>Status</Th></Tr>
        </Thead>
        <Tbody>
          {detail.invoices.map(inv => (
            <Tr key={inv.id}>
              <Td>{inv.invoiceNumber}</Td>
              <Td>{inv.billingLabel || inv.billingMonth}</Td>
              <Td isNumeric>{formatCurrency(inv.totalDue)}</Td>
              <Td><Badge>{inv.status}</Badge></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
