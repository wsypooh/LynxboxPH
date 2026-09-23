'use client'

import { Box, Container, Heading, Text, Button, VStack, HStack, SimpleGrid, Card, CardBody, Icon, Table, Thead, Tbody, Tr, Th, Td, Badge } from '@chakra-ui/react'
import { Building2, Search, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { route } from '@/utils/routing'

// docs/Pricing-Strategy-Plan.md — same row labels/order as that doc's tier table, so the
// two stay easy to compare at a glance. Universal rows (Ledger, VAT/EWT, CSV import) are
// called out once above the grid instead of repeated identically on every card.
const PRICING_TIERS = [
  {
    name: 'Free Forever',
    price: '₱0',
    period: 'Perfect for getting started',
    popular: false,
    rows: [
      ['Active property listings', '2'],
      ['Photos per listing', '3'],
      ['Listing visibility duration', '7 days (manual renew)'],
      ['Public search placement', 'Standard'],
      ['Invoices/month', '10'],
      ['Team seats', '1'],
      ['Document storage', '20 files / 100MB'],
      ['Batch ZIP invoice download', '–'],
      ['PDF branding', 'Lynxbox branded'],
      ['Support', 'Best-effort email'],
    ],
  },
  {
    name: 'Starter',
    price: '₱699',
    period: 'per month',
    popular: false,
    rows: [
      ['Active property listings', '5'],
      ['Photos per listing', 'Unlimited'],
      ['Listing visibility duration', '30 days'],
      ['Public search placement', 'Standard'],
      ['Invoices/month', '50'],
      ['Team seats', '2'],
      ['Document storage', '200 files / 1GB'],
      ['Batch ZIP invoice download', '✓'],
      ['PDF branding', 'Unbranded'],
      ['Support', 'Email'],
    ],
  },
  {
    name: 'Growth',
    price: '₱1,499',
    period: 'per month',
    popular: true,
    rows: [
      ['Active property listings', '15'],
      ['Photos per listing', 'Unlimited'],
      ['Listing visibility duration', '60 days'],
      ['Public search placement', 'Priority'],
      ['Invoices/month', '200'],
      ['Team seats', '5'],
      ['Document storage', '1,000 files / 5GB'],
      ['Batch ZIP invoice download', '✓'],
      ['PDF branding', 'Unbranded + custom logo'],
      ['Support', 'Priority email/chat'],
    ],
  },
  {
    name: 'Business',
    price: '₱2,990',
    period: 'per month',
    popular: false,
    rows: [
      ['Active property listings', 'Unlimited'],
      ['Photos per listing', 'Unlimited'],
      ['Listing visibility duration', 'No expiry'],
      ['Public search placement', 'Top/Featured'],
      ['Invoices/month', 'Unlimited'],
      ['Team seats', 'Unlimited'],
      ['Document storage', 'Unlimited (fair use)'],
      ['Batch ZIP invoice download', '✓'],
      ['PDF branding', 'Full white-label'],
      ['Support', 'Priority + dedicated onboarding'],
    ],
  },
] as const

export default function Home() {
  return (
    <Box as="main" m="0 !important" p="0 !important">
      {/* Hero Section */}
      <Box 
        as="section" 
        position="relative" 
        bg="primary.600" 
        color="white" 
        py={[16, 20, 28]} 
        m="0 !important"
        minH="70vh"
        display="flex"
        alignItems="center"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="gray.800"
          zIndex={0}
          overflow="hidden"
        >
          <Box
            as="img"
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
            alt="Modern office building"
            w="100%"
            h="100%"
            objectFit="cover"
            objectPosition="center"
          />
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bgGradient="linear(to-b, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)"
            zIndex={1}
          />
        </Box>
        <Container 
          maxW="container.xl" 
          px={[4, 6, 8]}
          position="relative"
          zIndex="2"
          h="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack 
            spacing={[4, 5, 6]} 
            textAlign="center" 
            m="0 !important"
            maxW="4xl"
            w="100%"
            justify="center"
          >
            <Heading size={['2xl', '3xl', '4xl']} fontWeight="bold" lineHeight="1.2">
              Lynxbox PH
            </Heading>
            <Text fontSize={['lg', 'xl', '2xl']} maxW="2xl" lineHeight="1.4" fontWeight="500">
              Helping Small Commercial Landlords Go Digital
            </Text>
            <Text fontSize={['md', 'lg', 'xl']} opacity={0.95} maxW="3xl" lineHeight="1.6">
              The premier digital listing and rental management platform designed for small commercial property owners in the Philippines.
            </Text>
            <HStack 
              spacing={4} 
              pt={[3, 4, 6]} 
              w={['full', 'auto']} 
              justifyContent="center"
              flexWrap="wrap"
              rowGap={4}
            >
              <Button 
                as={Link} 
                href={route('/auth/signup')} 
                size={['md', 'lg']} 
                variant="outline" 
                color="white" 
                borderColor="white" 
                _hover={{
                  bg: 'rgba(255, 255, 255, 0.1)'
                }}
                w={['full', 'auto']}
                px={8}
                py={6}
                fontSize={['md', 'lg']}
              >
                Get Started Free
              </Button>
              <Button 
                as={Link} 
                href={route('/properties')} 
                size={['md', 'lg']} 
                variant="outline" 
                color="white" 
                borderColor="white" 
                _hover={{
                  bg: 'rgba(255, 255, 255, 0.1)'
                }}
                w={['full', 'auto']} 
                px={8}
                py={6}
                fontSize={['md', 'lg']}
              >
                Browse Properties
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW="container.xl" py={20}>
        <VStack spacing={12}>
          <VStack spacing={4} textAlign="center">
            <Heading size="xl">Why Choose Lynxbox PH?</Heading>
            <Text fontSize="lg" color="gray.600" maxW="2xl">
              We provide everything you need to manage your commercial properties effectively
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
            <Card>
              <CardBody textAlign="center">
                <VStack spacing={4}>
                  <Icon as={Building2} boxSize={12} color="primary.500" />
                  <Heading size="md">Easy Listings</Heading>
                  <Text color="gray.600">
                    Create professional property listings with photos, descriptions, and location details
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody textAlign="center">
                <VStack spacing={4}>
                  <Icon as={Search} boxSize={12} color="primary.500" />
                  <Heading size="md">Smart Search</Heading>
                  <Text color="gray.600">
                    Map-based property search with advanced filters for location, price, and property type
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody textAlign="center">
                <VStack spacing={4}>
                  <Icon as={FileText} boxSize={12} color="primary.500" />
                  <Heading size="md">Invoicing Tools</Heading>
                  <Text color="gray.600">
                    Generate professional invoices and track payments from your tenants
                  </Text>
                </VStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody textAlign="center">
                <VStack spacing={4}>
                  <Icon as={Users} boxSize={12} color="primary.500" />
                  <Heading size="md">Tenant Management</Heading>
                  <Text color="gray.600">
                    Keep track of tenant information, lease agreements, and communication
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>
      </Container>

      {/* Pricing Section */}
      <Box id="pricing" bg="gray.50" py={20} as="section">
        <Container maxW="container.xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl">Simple, Transparent Pricing</Heading>
              <Text fontSize="lg" color="gray.600">
                Start free and upgrade as you grow
              </Text>
              <Text fontSize="sm" color="gray.500" maxW="2xl">
                Every plan includes the full ledger (FIFO payments &amp; penalty automation), automatic VAT/EWT computation with PDF Statements of Account, and CSV import for tenants &amp; ledger history.
              </Text>
            </VStack>

            <Box w="full" maxW="6xl" overflowX="auto" bg="white" borderRadius="lg" boxShadow="sm">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th></Th>
                    {PRICING_TIERS.map(tier => (
                      <Th key={tier.name} textAlign="center" bg={tier.popular ? 'primary.50' : undefined} borderTopWidth={tier.popular ? 2 : 0} borderColor="primary.500">
                        <VStack spacing={1} py={2} textTransform="none">
                          {tier.popular && <Badge colorScheme="primary" mb={1}>Most Popular</Badge>}
                          <Text fontSize="md" fontWeight="bold" color="gray.800">{tier.name}</Text>
                          <Text fontSize="xl" fontWeight="bold" color="gray.800">{tier.price}</Text>
                          <Text fontSize="xs" color="gray.500" fontWeight="normal">{tier.period}</Text>
                        </VStack>
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {PRICING_TIERS[0].rows.map(([label], rowIndex) => (
                    <Tr key={label}>
                      <Td fontWeight="medium" color="gray.700">{label}</Td>
                      {PRICING_TIERS.map(tier => (
                        <Td key={tier.name} textAlign="center" bg={tier.popular ? 'primary.50' : undefined}>
                          {tier.rows[rowIndex][1]}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                  <Tr>
                    <Td></Td>
                    {PRICING_TIERS.map(tier => (
                      <Td key={tier.name} textAlign="center" bg={tier.popular ? 'primary.50' : undefined} borderBottomWidth={tier.popular ? 2 : 0} borderColor="primary.500">
                        <Button as={Link} href={route('/auth/signup')} colorScheme="primary" size="sm" w="full">
                          Get Started
                        </Button>
                      </Td>
                    ))}
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box bg="primary.600" color="white" py={20}>
        <Container maxW="container.xl">
          <VStack spacing={6} textAlign="center">
            <Heading size="xl">Ready to Get Started?</Heading>
            <Text fontSize="lg" maxW="2xl">
              Join hundreds of property owners who are already using Lynxbox PH to manage their commercial properties
            </Text>
            <Button as={Link} href={route('/auth/signup')} size="lg" colorScheme="white" variant="solid">
              Create Your Free Account
            </Button>
          </VStack>
        </Container>
      </Box>
    </Box>
  )
}
