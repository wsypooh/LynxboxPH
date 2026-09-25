'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Flex,
  useColorModeValue,
  SimpleGrid,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Alert,
  AlertIcon,
  useToast
} from '@chakra-ui/react';
import { FiUsers } from 'react-icons/fi';
import { BsBuilding, BsBuildings } from 'react-icons/bs';
import { MdReceipt } from 'react-icons/md';
import { useAuth } from '@/features/auth/AuthContext';
import { getManagePropertyUrl } from '@/utils/routing';
import { propertyService } from '@/services/propertyService';
import { invoiceService } from '@/services/invoiceService';
import { billingService } from '@/services/billingService';
import { UsageSummary } from '@/features/billing/types';
import { Invoice, InvoiceStatus } from '@/features/invoicing/types';
import { formatFileSize, isPropertyExpired } from '@/lib/utils';

interface ActivityItem {
  key: string;
  at: string;
  invoiceId: string;
  invoiceNumber: string;
  lesseeName: string;
  buildingName: string;
  type: 'created' | 'status_change';
  from?: InvoiceStatus;
  to: InvoiceStatus;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLOR: Record<InvoiceStatus, { bg: string; text: string }> = {
  draft:    { bg: '#e2e8f0', text: '#4a5568' },
  sent:     { bg: '#bee3f8', text: '#2a69ac' },
  partial:  { bg: '#feebc8', text: '#c05621' },
  paid:     { bg: '#c6f6d5', text: '#276749' },
  printed:  { bg: '#e9d8fd', text: '#553c9a' },
  void:     { bg: '#fed7d7', text: '#c53030' },
};

function StatusPill({ status }: { status: InvoiceStatus }) {
  const c = STATUS_COLOR[status] ?? STATUS_COLOR.draft;
  return (
    <span style={{ background: c.bg, color: c.text, padding: '1px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500 }}>
      {status}
    </span>
  );
}

function buildActivities(invoices: Invoice[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const inv of invoices) {
    items.push({
      key: `${inv.id}-created`,
      at: inv.createdAt,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      lesseeName: inv.lesseeName,
      buildingName: inv.buildingName,
      type: 'created',
      to: 'draft',
    });
    for (const h of (inv.statusHistory ?? [])) {
      items.push({
        key: `${inv.id}-${h.changedAt}`,
        at: h.changedAt,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        lesseeName: inv.lesseeName,
        buildingName: inv.buildingName,
        type: 'status_change',
        from: h.from,
        to: h.to,
      });
    }
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, 15);
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  // docs/Payments-and-Subscription-Plan.md — plan usage vs. limits, for the stat cards
  // and the "Upgrade Now" banner below.
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  // Dynamic stats data based on user's properties
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    totalInquiries: 0,
    totalViews: 0
  });

  // Fetch user's property stats
  useEffect(() => {
    const fetchPropertyStats = async () => {
      if (!user?.userId) return;
      
      try {
        setStatsLoading(true);
        // Use the existing listProperties endpoint - it now automatically filters by authenticated user
        const response = await propertyService.listProperties({ limit: 100 });
        const properties = response.items || [];
        
        // Calculate stats from user's properties (already filtered by backend)
        const totalProperties = properties.length;
        // Same "counts against the plan cap" definition as the backend's usage.properties
        // (PropertyHandler.createProperty) — available and not expired — so this card's
        // number never disagrees with the "X of Y used" text right below it.
        const activeListings = properties.filter(p => p.status === 'available' && !isPropertyExpired(p.expiresAt)).length;
        const totalViews = properties.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalProperties,
          activeListings,
          totalViews
        }));
      } catch (error) {
        console.error('Error fetching property stats:', error);
        toast({
          title: 'Error',
          description: 'Failed to load property statistics',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchPropertyStats();
  }, [user?.userId, toast]);

  useEffect(() => {
    if (!user?.userId) return;
    setActivityLoading(true);
    invoiceService.listInvoices()
      .then(invoices => setActivities(buildActivities(invoices)))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [user?.userId]);

  useEffect(() => {
    if (!user?.userId) return;
    billingService.getUsage().then(setUsage).catch(() => {});
  }, [user?.userId]);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    } else {
      setLoading(false);
    }
  }, [user, isLoading, router]);

  if (isLoading || loading) {
    return (
      <Container maxW="container.xl" py={8} display="flex" justifyContent="center" alignItems="center" minH="60vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading dashboard...</Text>
        </VStack>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.xl">
        {/* Header */}
        <Flex align="center" mb={8}>
          <Box>
            <Heading size="lg" mb={1}>
              Welcome back, {user?.attributes?.name}!
            </Heading>
            <Text color="gray.600">Here&apos;s what&apos;s happening with your properties</Text>
          </Box>
        </Flex>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
          <Card bg={cardBg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Total Properties</StatLabel>
                <StatNumber>
                  {statsLoading ? <Spinner size="sm" /> : stats.totalProperties}
                </StatNumber>
                <StatHelpText>All your properties</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Active Listings</StatLabel>
                <StatNumber color="green.500">
                  {statsLoading ? <Spinner size="sm" /> : stats.activeListings}
                </StatNumber>
                <StatHelpText>
                  {usage && usage.limits.maxProperties !== Infinity
                    ? `${usage.usage.properties} of ${usage.limits.maxProperties} used`
                    : 'Available for rent'}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* docs/Payments-and-Subscription-Plan.md — plan usage vs. limits */}
        {usage && (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Invoices this month</StatLabel>
                  <StatNumber>{usage.usage.invoicesThisMonth}</StatNumber>
                  <StatHelpText>
                    {usage.limits.maxInvoicesPerMonth === Infinity ? 'Unlimited' : `of ${usage.limits.maxInvoicesPerMonth} allowed`}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Documents</StatLabel>
                  <StatNumber>{formatFileSize(usage.usage.documentBytes)}</StatNumber>
                  <StatHelpText>
                    {usage.limits.maxDocumentBytes === Infinity ? 'Unlimited' : `of ${formatFileSize(usage.limits.maxDocumentBytes)} allowed`}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Team seats</StatLabel>
                  <StatNumber>{usage.usage.seats}</StatNumber>
                  <StatHelpText>
                    {usage.limits.maxSeats === Infinity ? 'Unlimited' : `of ${usage.limits.maxSeats} allowed`}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Upgrade Notice — docs/Payments-and-Subscription-Plan.md */}
        {usage && usage.plan !== 'business' && (
          <Alert status={usage.plan === 'free' ? 'info' : 'warning'} borderRadius="md" variant="left-accent" mb={8}>
            <AlertIcon />
            <Box flex="1">
              <Text fontWeight="bold">
                You&apos;re on the {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} plan
              </Text>
              <Text fontSize="sm">
                {usage.plan === 'free'
                  ? 'Upgrade for more listings, higher invoice limits, and more features.'
                  : 'Upgrade to a higher plan for more listings, higher invoice limits, and more features.'}
              </Text>
            </Box>
            <Button as={Link} href="/dashboard/billing" colorScheme="blue" size="sm" ml={4}>
              Upgrade Now
            </Button>
          </Alert>
        )}

        {/* Quick Actions */}
        <Heading size="md" mb={4}>Quick Actions</Heading>
        <SimpleGrid columns={{ base: 1, md: 3, lg: 4 }} spacing={6} mb={8}>
          <Card
            as={Link}
            href={getManagePropertyUrl()}
            _hover={{ transform: 'translateY(-2px)', shadow: 'md', textDecoration: 'none' }}
            transition="all 0.2s"
            bg={cardBg}
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <VStack spacing={4} textAlign="center">
                <Box p={3} bg="blue.50" borderRadius="full" color="blue.600">
                  <Icon as={BsBuildings} boxSize={6} />
                </Box>
                <Heading size="md">Property Listings</Heading>
                <Text color="gray.600">View and manage your property listings</Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            as={Link}
            href="/dashboard/buildings"
            _hover={{ transform: 'translateY(-2px)', shadow: 'md', textDecoration: 'none' }}
            transition="all 0.2s"
            bg={cardBg}
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <VStack spacing={4} textAlign="center">
                <Box p={3} bg="orange.50" borderRadius="full" color="orange.600">
                  <Icon as={BsBuilding} boxSize={6} />
                </Box>
                <Heading size="md">Buildings</Heading>
                <Text color="gray.600">Manage buildings and rates</Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            as={Link}
            href="/dashboard/tenants"
            _hover={{ transform: 'translateY(-2px)', shadow: 'md', textDecoration: 'none' }}
            transition="all 0.2s"
            bg={cardBg}
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <VStack spacing={4} textAlign="center">
                <Box p={3} bg="green.50" borderRadius="full" color="green.600">
                  <Icon as={FiUsers} boxSize={6} />
                </Box>
                <Heading size="md">Tenants</Heading>
                <Text color="gray.600">View and manage your tenants</Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            as={Link}
            href="/dashboard/invoices"
            _hover={{ transform: 'translateY(-2px)', shadow: 'md', textDecoration: 'none' }}
            transition="all 0.2s"
            bg={cardBg}
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <VStack spacing={4} textAlign="center">
                <Box p={3} bg="teal.50" borderRadius="full" color="teal.600">
                  <Icon as={MdReceipt} boxSize={6} />
                </Box>
                <Heading size="md">Invoices</Heading>
                <Text color="gray.600">Create and manage rental invoices</Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Recent Activity */}
        <Card bg={cardBg} border="1px" borderColor={borderColor} mb={8}>
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Recent Activity</Heading>
              <Button as={Link} href="/dashboard/invoices" size="xs" variant="ghost" colorScheme="blue">
                View all invoices →
              </Button>
            </HStack>
            {activityLoading ? (
              <Box textAlign="center" py={6}><Spinner size="sm" /></Box>
            ) : activities.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Text fontStyle="italic" color="gray.500">No recent activity to show</Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={0} divider={<Box borderBottom="1px" borderColor={borderColor} />}>
                {activities.map(item => (
                  <Box
                    key={item.key}
                    py={3}
                    px={2}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    borderRadius="md"
                    onClick={() => router.push(`/dashboard/invoices/detail?id=${item.invoiceId}`)}
                  >
                    <HStack justify="space-between" align="start">
                      <Box flex={1} minW={0}>
                        <HStack spacing={2} flexWrap="wrap">
                          <Text fontFamily="mono" fontSize="xs" color="gray.500">{item.invoiceNumber}</Text>
                          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{item.lesseeName}</Text>
                          <Text fontSize="xs" color="gray.400">·</Text>
                          <Text fontSize="xs" color="gray.500">{item.buildingName}</Text>
                        </HStack>
                        <HStack spacing={2} mt={1} flexWrap="wrap">
                          {item.type === 'created' ? (
                            <Text fontSize="xs" color="gray.600">Invoice created</Text>
                          ) : (
                            <HStack spacing={1}>
                              <StatusPill status={item.from!} />
                              <Text fontSize="xs" color="gray.500">→</Text>
                              <StatusPill status={item.to} />
                            </HStack>
                          )}
                        </HStack>
                      </Box>
                      <Text fontSize="xs" color="gray.400" whiteSpace="nowrap" ml={2}>{timeAgo(item.at)}</Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}