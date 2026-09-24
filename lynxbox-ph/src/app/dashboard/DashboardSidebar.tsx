'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box, VStack, Text, Icon, Flex, Select, IconButton,
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody,
  useDisclosure,
} from '@chakra-ui/react';
import { FiUsers, FiLayout, FiShield, FiUserCheck, FiCreditCard, FiCheckSquare, FiTag, FiMenu } from 'react-icons/fi';
import { BsBuilding, BsBuildings } from 'react-icons/bs';
import { MdReceipt } from 'react-icons/md';
import { IconType } from 'react-icons';
import { getIsPlatformAdmin } from '@/lib/auth';
import { useAccount } from '@/features/account/AccountContext';

type NavItem = { label: string; href: string; icon: IconType };

const navItems: NavItem[] = [
  { label: 'Dashboard',          href: '/dashboard',                    icon: FiLayout },
  { label: 'Property Listings',  href: '/dashboard/properties/manage',  icon: BsBuildings },
  { label: 'Buildings',          href: '/dashboard/buildings',          icon: BsBuilding },
  { label: 'Tenants',            href: '/dashboard/tenants',            icon: FiUsers },
  { label: 'Invoices',           href: '/dashboard/invoices',           icon: MdReceipt },
  { label: 'Billing',            href: '/dashboard/billing',            icon: FiCreditCard },
];

const platformAdminNavItem: NavItem = { label: 'Platform Admin', href: '/dashboard/platform-admin', icon: FiShield };
// docs/Payments-and-Subscription-Plan.md — platform-admin's payment verification surface.
const paymentVerificationNavItem: NavItem = { label: 'Payment Verification', href: '/dashboard/platform-admin/payments', icon: FiCheckSquare };
const promoCodesNavItem: NavItem = { label: 'Promo Codes', href: '/dashboard/platform-admin/promo-codes', icon: FiTag };
const teamNavItem: NavItem = { label: 'Team', href: '/dashboard/team', icon: FiUserCheck };

// Shared by the desktop sidebar and the mobile drawer so the two link lists can't drift apart.
function useDashboardNav() {
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const { accountId, memberships, canManageMembers, switchAccount } = useAccount();

  useEffect(() => {
    getIsPlatformAdmin().then(setIsPlatformAdmin);
  }, []);

  let items = navItems;
  if (canManageMembers) items = [...items, teamNavItem];
  if (isPlatformAdmin) items = [...items, platformAdminNavItem, paymentVerificationNavItem, promoCodesNavItem];

  // A plain `pathname.startsWith(href)` made a parent nav item (e.g. "Platform Admin")
  // highlight alongside its own child pages ("Payment Verification", "Promo Codes"),
  // since a child's path is always also a prefix-match of the parent's. Only the most
  // specific (longest) matching href among all nav items should actually highlight.
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    const matches = (h: string) => h !== '/dashboard' && (pathname === h || pathname.startsWith(`${h}/`));
    if (!matches(href)) return false;
    const mostSpecific = items.map(i => i.href).filter(matches).reduce((a, b) => (b.length > a.length ? b : a));
    return mostSpecific === href;
  };

  return { items, isActive, accountId, memberships, switchAccount };
}

function AccountSwitcher({ accountId, memberships, switchAccount }: {
  accountId: string;
  memberships: ReturnType<typeof useAccount>['memberships'];
  switchAccount: ReturnType<typeof useAccount>['switchAccount'];
}) {
  if (memberships.length <= 1) return null;
  return (
    <Box px={4} pb={4}>
      <Text fontSize="xs" color="gray.500" mb={1}>Account</Text>
      <Select size="sm" value={accountId} onChange={(e) => switchAccount(e.target.value)}>
        {memberships.map(m => (
          <option key={m.accountId} value={m.accountId}>
            {m.role === 'owner' ? 'My Account' : `${m.ownerEmail || m.accountId.slice(0, 8) + '…'} (${m.role})`}
          </option>
        ))}
      </Select>
    </Box>
  );
}

function NavLinks({ items, isActive, onNavigate }: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <VStack spacing={1} align="stretch">
      {items.map(({ label, href, icon }) => {
        const active = isActive(href);
        return (
          <Flex
            key={href}
            as={Link}
            href={href}
            onClick={onNavigate}
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
  );
}

export function DashboardSidebar() {
  const { items, isActive, accountId, memberships, switchAccount } = useDashboardNav();

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
      <AccountSwitcher accountId={accountId} memberships={memberships} switchAccount={switchAccount} />
      <NavLinks items={items} isActive={isActive} />
    </Box>
  );
}

// Below `md`, DashboardSidebar is `display: none` with no substitute — this renders a
// full-width bar with a hamburger that opens the same links in a Drawer, so every sidebar
// item (Team, Platform Admin, etc., not just the ones with a quick-link card on /dashboard)
// stays reachable on small screens.
export function DashboardMobileNav() {
  const { items, isActive, accountId, memberships, switchAccount } = useDashboardNav();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box display={{ base: 'block', md: 'none' }}>
      <Flex align="center" px={4} py={3} borderBottom="1px" borderColor="gray.200" bg="white">
        <IconButton aria-label="Open menu" icon={<FiMenu />} onClick={onOpen} variant="ghost" size="sm" mr={3} />
        <Text fontWeight="semibold" fontSize="sm" color="gray.700">Menu</Text>
      </Flex>
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px" borderColor="gray.200" fontSize="md">Menu</DrawerHeader>
          <DrawerBody px={0} py={4}>
            <AccountSwitcher accountId={accountId} memberships={memberships} switchAccount={switchAccount} />
            <NavLinks items={items} isActive={isActive} onNavigate={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
