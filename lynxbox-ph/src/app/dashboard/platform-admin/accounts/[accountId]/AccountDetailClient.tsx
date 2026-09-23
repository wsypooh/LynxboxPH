'use client';
import { useState, useEffect } from 'react';
import {
  Box, Heading, Text, Spinner, useToast, SimpleGrid, Card, CardHeader, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, HStack, Select, Button,
} from '@chakra-ui/react';
import { platformAdminService } from '@/services/platformAdminService';
import { AccountDetail, Plan } from '@/features/platform-admin/types';

const PLAN_OPTIONS: Plan[] = ['free', 'starter', 'growth', 'business'];

function formatCurrency(amount: number): string {
  return (amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

export default function AccountDetailClient({ accountId }: { accountId: string }) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('free');
  const [savingPlan, setSavingPlan] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!accountId) return;
    platformAdminService.getAccountDetail(accountId)
      .then(d => { setDetail(d); setSelectedPlan(d.plan); })
      .catch(() => toast({ title: 'Failed to load account', status: 'error' }))
      .finally(() => setLoading(false));
  }, [accountId, toast]);

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      await platformAdminService.updateAccountPlan(accountId, selectedPlan);
      setDetail(prev => prev ? { ...prev, plan: selectedPlan } : prev);
      toast({ title: `Plan updated to ${selectedPlan}`, status: 'success' });
    } catch {
      toast({ title: 'Failed to update plan', status: 'error' });
    } finally {
      setSavingPlan(false);
    }
  };

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
        Read-only for this account&apos;s data &mdash; the only edit action here is its plan (docs/Pricing-Strategy-Plan.md), pending real billing.
      </Text>

      <HStack mb={8} spacing={3}>
        <Text fontWeight="medium">Plan:</Text>
        <Select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value as Plan)} w="200px" size="sm">
          {PLAN_OPTIONS.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </Select>
        <Button
          size="sm"
          colorScheme="primary"
          isDisabled={selectedPlan === detail.plan}
          isLoading={savingPlan}
          onClick={handleSavePlan}
        >
          Save
        </Button>
      </HStack>

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
