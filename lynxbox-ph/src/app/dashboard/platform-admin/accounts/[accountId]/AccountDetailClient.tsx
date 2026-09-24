'use client';
import { useState, useEffect } from 'react';
import {
  Box, Heading, Text, Spinner, useToast, SimpleGrid, Card, CardHeader, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, HStack, Select, Button, Input,
} from '@chakra-ui/react';
import { platformAdminService } from '@/services/platformAdminService';
import { paymentVerificationService } from '@/services/paymentVerificationService';
import { AccountDetail, Plan } from '@/features/platform-admin/types';
import { PaidPlan } from '@/features/billing/types';

// yyyy-MM-dd for a native <input type="date">.
function toDateInputValue(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

const PLAN_OPTIONS: Plan[] = ['free', 'starter', 'growth', 'business'];
const PAID_PLAN_OPTIONS: Plan[] = ['starter', 'growth', 'business'];

function formatCurrency(amount: number): string {
  return (amount ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
}

export default function AccountDetailClient({ accountId }: { accountId: string }) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('free');
  const [savingPlan, setSavingPlan] = useState(false);
  const [newTrialEndsAt, setNewTrialEndsAt] = useState('');
  const [extendingTrial, setExtendingTrial] = useState(false);
  const [grantPlan, setGrantPlan] = useState<Plan>('starter');
  const toast = useToast();

  useEffect(() => {
    if (!accountId) return;
    platformAdminService.getAccountDetail(accountId)
      .then(d => { setDetail(d); setSelectedPlan(d.plan); setNewTrialEndsAt(toDateInputValue(d.trialEndsAt)); })
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

  const isTrialing = detail?.subscriptionStatus === 'trialing';

  // docs/Payments-and-Subscription-Plan.md — case-by-case trial extension. While already
  // trialing, this just pushes the date out. For a lapsed trial (any other status), a
  // plan must be picked too, since reverting to Free erases which plan it was trialing —
  // this re-grants one from scratch, bypassing hasUsedTrial as a deliberate admin override.
  const handleExtendTrial = async () => {
    if (!newTrialEndsAt) {
      toast({ title: 'Pick a new trial end date', status: 'error' });
      return;
    }
    setExtendingTrial(true);
    try {
      const updated = await paymentVerificationService.extendTrial(
        accountId,
        new Date(newTrialEndsAt).toISOString(),
        undefined,
        isTrialing ? undefined : (grantPlan as PaidPlan)
      );
      setDetail(prev => prev ? { ...prev, trialEndsAt: updated.trialEndsAt, plan: updated.plan, subscriptionStatus: updated.subscriptionStatus } : prev);
      toast({ title: isTrialing ? 'Trial extended' : `New ${updated.plan} trial started`, status: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Failed to extend trial', status: 'error' });
    } finally {
      setExtendingTrial(false);
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
      <Heading size="lg" mb={4}>Account: {detail.ownerEmail || detail.accountId}</Heading>

      <HStack mb={4} spacing={3}>
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
        <Badge colorScheme={detail.subscriptionStatus === 'trialing' ? 'blue' : detail.subscriptionStatus === 'active' ? 'green' : detail.subscriptionStatus === 'past_due' ? 'red' : 'gray'}>
          {detail.subscriptionStatus}
        </Badge>
      </HStack>

      {isTrialing ? (
        <HStack mb={8} spacing={3}>
          <Text fontWeight="medium">Trial ends:</Text>
          <Input type="date" value={newTrialEndsAt} onChange={e => setNewTrialEndsAt(e.target.value)} w="200px" size="sm" />
          <Button
            size="sm"
            colorScheme="primary"
            variant="outline"
            isDisabled={newTrialEndsAt === toDateInputValue(detail.trialEndsAt)}
            isLoading={extendingTrial}
            onClick={handleExtendTrial}
          >
            Extend Trial
          </Button>
        </HStack>
      ) : (
        <HStack mb={8} spacing={3}>
          <Text fontWeight="medium">Grant a new trial:</Text>
          <Select value={grantPlan} onChange={e => setGrantPlan(e.target.value as Plan)} w="140px" size="sm">
            {PAID_PLAN_OPTIONS.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </Select>
          <Text fontSize="sm" color="gray.500">until</Text>
          <Input type="date" value={newTrialEndsAt} onChange={e => setNewTrialEndsAt(e.target.value)} w="200px" size="sm" />
          <Button
            size="sm"
            colorScheme="primary"
            variant="outline"
            isLoading={extendingTrial}
            onClick={handleExtendTrial}
          >
            Start New Trial
          </Button>
        </HStack>
      )}

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
