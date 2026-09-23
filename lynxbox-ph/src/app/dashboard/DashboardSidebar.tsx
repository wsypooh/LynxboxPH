'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, VStack, Text, Icon, Flex, Select } from '@chakra-ui/react';
import { FiUsers, FiLayout, FiShield, FiUserCheck } from 'react-icons/fi';
import { BsBuilding, BsBuildings } from 'react-icons/bs';
import { MdReceipt } from 'react-icons/md';
import { getIsPlatformAdmin } from '@/lib/auth';
import { useAccount } from '@/features/account/AccountContext';

const navItems = [
  { label: 'Dashboard',          href: '/dashboard',                    icon: FiLayout },
  { label: 'Property Listings',  href: '/dashboard/properties/manage',  icon: BsBuildings },
  { label: 'Buildings',          href: '/dashboard/buildings',          icon: BsBuilding },
  { label: 'Tenants',            href: '/dashboard/tenants',            icon: FiUsers },
  { label: 'Invoices',           href: '/dashboard/invoices',           icon: MdReceipt },
];

const platformAdminNavItem = { label: 'Platform Admin', href: '/dashboard/platform-admin', icon: FiShield };
const teamNavItem = { label: 'Team', href: '/dashboard/team', icon: FiUserCheck };

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const { accountId, memberships, canManageMembers, switchAccount } = useAccount();

  useEffect(() => {
    getIsPlatformAdmin().then(setIsPlatformAdmin);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  let items = navItems;
  if (canManageMembers) items = [...items, teamNavItem];
  if (isPlatformAdmin) items = [...items, platformAdminNavItem];

  return (
    <Box
      as="nav"
      w="200px"
      minW="200px"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      position="sticky"
      top="0"
      alignSelf="flex-start"
      h="calc(100vh - 65px)"
      overflowY="auto"
      py={6}
      display={{ base: 'none', md: 'block' }}
    >
      {memberships.length > 1 && (
        <Box px={4} pb={4}>
          <Text fontSize="xs" color="gray.500" mb={1}>Account</Text>
          <Select
            size="sm"
            value={accountId}
            onChange={(e) => switchAccount(e.target.value)}
          >
            {memberships.map(m => (
              <option key={m.accountId} value={m.accountId}>
                {m.role === 'owner' ? 'My Account' : `${m.accountId.slice(0, 8)}… (${m.role})`}
              </option>
            ))}
          </Select>
        </Box>
      )}
      <VStack spacing={1} align="stretch">
        {items.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <Flex
              key={href}
              as={Link}
              href={href}
              align="center"
              gap={3}
              px={4}
              py={3}
              fontSize="sm"
              fontWeight={active ? 'semibold' : 'normal'}
              color={active ? 'blue.600' : 'gray.700'}
              bg={active ? 'blue.50' : 'transparent'}
              borderLeft="3px solid"
              borderColor={active ? 'blue.500' : 'transparent'}
              _hover={{ bg: 'gray.50', color: 'blue.600', textDecoration: 'none' }}
              transition="all 0.15s"
            >
              <Icon as={icon} boxSize={4} />
              <Text>{label}</Text>
            </Flex>
          );
        })}
      </VStack>
    </Box>
  );
}
