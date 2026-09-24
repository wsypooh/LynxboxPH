'use client';
import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td, Spinner, useToast, Badge, HStack, Link as ChakraLink, Tooltip,
} from '@chakra-ui/react';
import { platformAdminService } from '@/services/platformAdminService';
import { AccountSummary, PlatformSummary, Plan } from '@/features/platform-admin/types';

const PLAN_BADGE_COLOR: Record<Plan, string> = {
  free: 'gray',
  starter: 'blue',
  growth: 'purple',
  business: 'orange',
};

// Purely a display heuristic, computed from data already on the row — not a stored flag.
// Flags an account that's never done anything: still on Free, no team invited, and zero
// of every kind of business record. Doesn't try to distinguish "just invited staff" from
// "a genuinely new signup that hasn't started yet" — both look identical from this data.
function isAccountInactive(account: AccountSummary): boolean {
  return account.plan === 'free'
    && account.memberCount <= 1
    && account.propertyCount === 0
    && account.activeListingCount === 0
    && account.buildingCount === 0
    && account.tenantCount === 0
    && account.documentCount === 0
    && Object.keys(account.invoicesByMonth).length === 0;
}

export default function PlatformAdminDashboardPage() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    platformAdminService.getDashboardSummary()
      .then(setSummary)
      .catch(() => toast({ title: 'Failed to load platform summary', status: 'error' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <Box p={8}>
        <Spinner />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box p={8}>
        <Text>Unable to load platform summary.</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Heading size="lg" mb={1}>Platform Admin</Heading>
      <Text color="gray.500" mb={6}>
        Read-only view across every account &mdash; {summary.totalAccounts} account{summary.totalAccounts === 1 ? '' : 's'} total.
      </Text>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Account</Th>
            <Th minW="160px">Signed Up</Th>
            <Th>Plan</Th>
            <Th isNumeric>Members</Th>
            <Th isNumeric>Properties</Th>
            <Th isNumeric>Active Listings</Th>
            <Th isNumeric>Buildings</Th>
            <Th isNumeric>Tenants</Th>
            <Th isNumeric>Documents</Th>
            <Th>Invoices by month</Th>
          </Tr>
        </Thead>
        <Tbody>
          {summary.accounts.map(account => (
            <Tr key={account.accountId} _hover={{ bg: 'gray.50' }}>
              <Td>
                <HStack spacing={2}>
                  <ChakraLink
                    as={NextLink}
                    href={`/dashboard/platform-admin/accounts/${account.accountId}`}
                    color="blue.600"
                    fontWeight="medium"
                  >
                    {account.ownerEmail || account.accountId}
                  </ChakraLink>
                  {isAccountInactive(account) && (
                    <Tooltip label="Still on Free, no team, and no properties/buildings/tenants/documents/invoices yet">
                      <Badge colorScheme="gray" fontSize="2xs">
                        Inactive
                      </Badge>
                    </Tooltip>
                  )}
                </HStack>
              </Td>
              <Td>
                <Text fontSize="sm" color="gray.600">
                  {account.signupDate ? new Date(account.signupDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </Text>
              </Td>
              <Td>
                <HStack spacing={2}>
                  <Badge colorScheme={PLAN_BADGE_COLOR[account.plan]}>
                    {account.plan.charAt(0).toUpperCase() + account.plan.slice(1)}
                  </Badge>
                  {account.subscriptionStatus === 'trialing' && account.trialEndsAt && (
                    <Text fontSize="xs" color="gray.500">
                      trial ends {new Date(account.trialEndsAt).toLocaleDateString('en-PH')}
                    </Text>
                  )}
                  {account.subscriptionStatus === 'past_due' && (
                    <Badge colorScheme="red">Past Due</Badge>
                  )}
                </HStack>
              </Td>
              <Td isNumeric>{account.memberCount}</Td>
              <Td isNumeric>{account.propertyCount}</Td>
              <Td isNumeric>{account.activeListingCount}</Td>
              <Td isNumeric>{account.buildingCount}</Td>
              <Td isNumeric>{account.tenantCount}</Td>
              <Td isNumeric>{account.documentCount}</Td>
              <Td>
                <HStack spacing={2} wrap="wrap">
                  {Object.entries(account.invoicesByMonth)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, count]) => (
                      <Badge key={month} colorScheme="blue">{month}: {count}</Badge>
                    ))}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
