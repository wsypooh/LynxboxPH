'use client';
import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td, Spinner, useToast, Badge, HStack, Link as ChakraLink,
} from '@chakra-ui/react';
import { platformAdminService } from '@/services/platformAdminService';
import { PlatformSummary } from '@/features/platform-admin/types';

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
            <Th isNumeric>Members</Th>
            <Th isNumeric>Properties</Th>
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
                <ChakraLink
                  as={NextLink}
                  href={`/dashboard/platform-admin/accounts/${account.accountId}`}
                  color="blue.600"
                  fontWeight="medium"
                >
                  {account.ownerEmail || account.accountId}
                </ChakraLink>
              </Td>
              <Td isNumeric>{account.memberCount}</Td>
              <Td isNumeric>{account.propertyCount}</Td>
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
