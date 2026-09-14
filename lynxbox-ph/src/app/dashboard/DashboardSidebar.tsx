'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, VStack, Text, Icon, Flex } from '@chakra-ui/react';
import { FiUsers, FiFileText, FiLayout } from 'react-icons/fi';
import { BsBuilding, BsBuildings } from 'react-icons/bs';
import { MdReceipt } from 'react-icons/md';

const navItems = [
  { label: 'Dashboard',          href: '/dashboard',                    icon: FiLayout },
  { label: 'Property Listings',  href: '/dashboard/properties/manage',  icon: BsBuildings },
  { label: 'Buildings',          href: '/dashboard/buildings',          icon: BsBuilding },
  { label: 'Tenants',            href: '/dashboard/tenants',            icon: FiUsers },
  { label: 'Invoices',           href: '/dashboard/invoices',           icon: MdReceipt },
  { label: 'Documents',          href: '/dashboard/documents',          icon: FiFileText },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

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
      <VStack spacing={1} align="stretch">
        {navItems.map(({ label, href, icon }) => {
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
