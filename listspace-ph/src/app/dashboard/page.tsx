'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Flex,
  Spacer,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import {
  Building2,
  Plus,
  Eye,
  Phone,
  Mail,
  Settings,
  LogOut,
  TrendingUp,
  Users,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { PropertyCard } from '@/features/properties/components/PropertyCard'
import { PropertyService } from '@/features/properties/services/propertyService'
import { Property } from '@/features/properties/types'

export default function DashboardPage() {
  const { user, signOut, isLoading } = useAuth()
  const router = useRouter()
  const [userProperties, setUserProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalViews: 0,
    totalInquiries: 0,
    activeListings: 0,
  })

  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const cardBg = useColorModeValue('white', 'gray.800')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
    } else if (user) {
      loadDashboardData()
    }
  }, [user, isLoading, router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      // In a real app, this would filter by user ID
      const result = await PropertyService.searchProperties({ limit: 10 })
      setUserProperties(result.properties)
      
      // Calculate stats
      const totalViews = result.properties.reduce((sum, prop) => sum + prop.viewCount, 0)
      const activeListings = result.properties.filter(prop => prop.status === 'available').length
      
      setStats({
        totalProperties: result.properties.length,
        totalViews,
        totalInquiries: Math.floor(totalViews * 0.1), // Mock calculation
        activeListings,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const handleContact = (property: Property) => {
    window.open(`tel:${property.contactInfo.phone}`, '_self')
  }

  if (isLoading || loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Loading...</Text>
      </Container>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Flex align="center" bg={cardBg} p={6} borderRadius="lg" shadow="sm">
            <HStack spacing={4}>
              <Avatar size="lg" name={user.username} />
              <VStack align="start" spacing={1}>
                <Heading size="lg">Welcome back, {user.username}!</Heading>
                <Text color="gray.600">Manage your commercial properties</Text>
              </VStack>
            </HStack>
            <Spacer />
            <HStack spacing={4}>
              <Button
                as={Link}
                href="/dashboard/properties/new"
                leftIcon={<Icon as={Plus} />}
                colorScheme="primary"
              >
                Add Property
              </Button>
              <Menu>
                <MenuButton as={Button} variant="ghost">
                  <Icon as={Settings} />
                </MenuButton>
                <MenuList>
                  <MenuItem as={Link} href="/dashboard/profile" icon={<Settings />}>
                    Profile Settings
                  </MenuItem>
                  <MenuItem onClick={handleSignOut} icon={<LogOut />}>
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>

          {/* Stats Cards */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Properties</StatLabel>
                  <StatNumber color="primary.500">{stats.totalProperties}</StatNumber>
                  <StatHelpText>
                    <Icon as={Building2} mr={1} />
                    All listings
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Active Listings</StatLabel>
                  <StatNumber color="green.500">{stats.activeListings}</StatNumber>
                  <StatHelpText>
                    <Icon as={TrendingUp} mr={1} />
                    Available for rent
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Views</StatLabel>
                  <StatNumber color="blue.500">{stats.totalViews}</StatNumber>
                  <StatHelpText>
                    <Icon as={Eye} mr={1} />
                    All time views
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Inquiries</StatLabel>
                  <StatNumber color="orange.500">{stats.totalInquiries}</StatNumber>
                  <StatHelpText>
                    <Icon as={Users} mr={1} />
                    This month
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Quick Actions */}
          <Card bg={cardBg}>
            <CardHeader>
              <Heading size="md">Quick Actions</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Button
                  as={Link}
                  href="/dashboard/properties/new"
                  leftIcon={<Icon as={Plus} />}
                  variant="outline"
                  size="lg"
                  h="auto"
                  py={4}
                >
                  <VStack spacing={1}>
                    <Text>Add New Property</Text>
                    <Text fontSize="sm" color="gray.500">List a new commercial space</Text>
                  </VStack>
                </Button>

                <Button
                  as={Link}
                  href="/dashboard/invoices"
                  leftIcon={<Icon as={FileText} />}
                  variant="outline"
                  size="lg"
                  h="auto"
                  py={4}
                >
                  <VStack spacing={1}>
                    <Text>Create Invoice</Text>
                    <Text fontSize="sm" color="gray.500">Generate rental invoices</Text>
                  </VStack>
                </Button>

                <Button
                  as={Link}
                  href="/dashboard/analytics"
                  leftIcon={<Icon as={TrendingUp} />}
                  variant="outline"
                  size="lg"
                  h="auto"
                  py={4}
                >
                  <VStack spacing={1}>
                    <Text>View Analytics</Text>
                    <Text fontSize="sm" color="gray.500">Track performance</Text>
                  </VStack>
                </Button>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Recent Properties */}
          <Card bg={cardBg}>
            <CardHeader>
              <Flex align="center">
                <Heading size="md">Your Properties</Heading>
                <Spacer />
                <Button as={Link} href="/dashboard/properties" variant="ghost" size="sm">
                  View All
                </Button>
              </Flex>
            </CardHeader>
            <CardBody>
              {userProperties.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {userProperties.slice(0, 6).map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onContact={handleContact}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <VStack spacing={4} py={8} textAlign="center">
                  <Icon as={Building2} boxSize={16} color="gray.300" />
                  <Heading size="md" color="gray.500">No properties yet</Heading>
                  <Text color="gray.400">
                    You&apos;re all caught up! No pending tasks. Start by adding your first commercial property listing
                  </Text>
                  <Button
                    as={Link}
                    href="/dashboard/properties/new"
                    leftIcon={<Icon as={Plus} />}
                    colorScheme="blue"
                  >
                    Add Your First Property
                  </Button>
                </VStack>
              )}
            </CardBody>
          </Card>

          {/* Upgrade Notice for Free Users */}
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <VStack align="start" spacing={1} flex={1}>
              <Text fontWeight="medium">You&apos;re on the Free plan</Text>
              <Text fontSize="sm">
                Upgrade to Professional for unlimited listings, analytics, and more features.
              </Text>
            </VStack>
            <Button as={Link} href="/pricing" colorScheme="blue" size="sm" ml={4}>
              Upgrade
            </Button>
          </Alert>
        </VStack>
      </Container>
    </Box>
  )
}
