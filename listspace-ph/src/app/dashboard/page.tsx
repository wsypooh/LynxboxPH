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
import { FiSettings, FiLogOut, FiHome, FiUsers, FiFileText, FiPlus, FiUser } from 'react-icons/fi';
import { useAuth } from '@/features/auth/AuthContext';
import { getManagePropertyUrl } from '@/utils/routing';
import { propertyService } from '@/services/propertyService';

export default function DashboardPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Dynamic stats data based on user's properties
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    totalRevenue: 0,
    occupancyRate: 0,
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
        const activeListings = properties.filter(p => p.status === 'available').length;
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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

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
          <Flex ml="auto" gap={3}>
            <Button
              leftIcon={<FiUser />}
              variant="outline"
              as={Link}
              href="/dashboard/profile"
            >
              Profile
            </Button>
            <Button
              leftIcon={<FiSettings />}
              variant="outline"
              as={Link}
              href="/dashboard/settings"
            >
              Settings
            </Button>
            <Button
              leftIcon={<FiLogOut />}
              colorScheme="red"
              variant="outline"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </Flex>
        </Flex>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
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
                <StatHelpText>Available for rent</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Total Revenue</StatLabel>
                <StatNumber>${stats.totalRevenue.toLocaleString()}</StatNumber>
                <StatHelpText>This month</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} border="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Occupancy Rate</StatLabel>
                <StatNumber>{stats.occupancyRate}%</StatNumber>
                <StatHelpText>Current occupancy</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Quick Actions */}
        <Heading size="md" mb={4}>Quick Actions</Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
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
                  <Icon as={FiHome} boxSize={6} />
                </Box>
                <Heading size="md">Manage Property</Heading>
                <Text color="gray.600">View and manage your property listings</Text>
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
                <Heading size="md">Manage Tenants</Heading>
                <Text color="gray.600">View and manage your tenants</Text>
              </VStack>
            </CardBody>
          </Card>

          <Card 
            as={Link} 
            href="/dashboard/documents" 
            _hover={{ transform: 'translateY(-2px)', shadow: 'md', textDecoration: 'none' }} 
            transition="all 0.2s"
            bg={cardBg}
            border="1px"
            borderColor={borderColor}
          >
            <CardBody>
              <VStack spacing={4} textAlign="center">
                <Box p={3} bg="purple.50" borderRadius="full" color="purple.600">
                  <Icon as={FiFileText} boxSize={6} />
                </Box>
                <Heading size="md">Documents</Heading>
                <Text color="gray.600">View and manage your documents</Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Recent Activity */}
        <Card bg={cardBg} border="1px" borderColor={borderColor} mb={8}>
          <CardBody>
            <VStack align="start" spacing={4}>
              <Heading size="md">Recent Activity</Heading>
              <Text color="gray.600">Your recent activities will appear here</Text>
              <Box w="100%" textAlign="center" py={4}>
                <Text fontStyle="italic" color="gray.500">No recent activity to show</Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Upgrade Notice */}
        <Alert status="info" borderRadius="md" variant="left-accent">
          <AlertIcon />
          <Box flex="1">
            <Text fontWeight="bold">You&apos;re on the Free plan</Text>
            <Text fontSize="sm">
              Upgrade to Professional for unlimited listings, analytics, and more features.
            </Text>
          </Box>
          <Button as={Link} href="/pricing" colorScheme="blue" size="sm" ml={4}>
            Upgrade Now
          </Button>
        </Alert>
      </Container>
    </Box>
  );
}