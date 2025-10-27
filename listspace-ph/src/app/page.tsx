'use client'

import { Box, Container, Heading, Text, Button, VStack, HStack, SimpleGrid, Card, CardBody, Icon } from '@chakra-ui/react'
import { Building2, Search, FileText, Users } from 'lucide-react'
import Link from 'next/link'

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
              ListSpace PH
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
                href="/auth/signup" 
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
                href="/properties" 
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
            <Heading size="xl">Why Choose ListSpace PH?</Heading>
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
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} maxW="4xl">
              {/* Free Plan */}
              <Card>
                <CardBody textAlign="center" p={8}>
                  <VStack spacing={6}>
                    <VStack spacing={2}>
                      <Heading size="lg">Free</Heading>
                      <Text fontSize="3xl" fontWeight="bold">₱0</Text>
                      <Text color="gray.600">Perfect for getting started</Text>
                    </VStack>
                    <VStack spacing={2} align="start">
                      <Text>• 1 active listing</Text>
                      <Text>• 3 photos per listing</Text>
                      <Text>• 7-day listing duration</Text>
                      <Text>• Basic search visibility</Text>
                    </VStack>
                    <Button as={Link} href="/auth/signup" colorScheme="primary" size="lg" w="full">
                      Get Started
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Professional Plan */}
              <Card borderWidth={2} borderColor="primary.500" position="relative">
                <Box
                  position="absolute"
                  top="-12px"
                  left="50%"
                  transform="translateX(-50%)"
                  bg="primary.500"
                  color="white"
                  px={4}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="bold"
                >
                  Most Popular
                </Box>
                <CardBody textAlign="center" p={8}>
                  <VStack spacing={6}>
                    <VStack spacing={2}>
                      <Heading size="lg">Professional</Heading>
                      <Text fontSize="3xl" fontWeight="bold">₱1,490</Text>
                      <Text color="gray.600">per month</Text>
                    </VStack>
                    <VStack spacing={2} align="start">
                      <Text>• 10 active listings</Text>
                      <Text>• Unlimited photos</Text>
                      <Text>• 30-day listing duration</Text>
                      <Text>• Analytics dashboard</Text>
                      <Text>• Invoice generation</Text>
                    </VStack>
                    <Button as={Link} href="/auth/signup" colorScheme="primary" size="lg" w="full">
                      Start Free Trial
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              {/* Enterprise Plan */}
              <Card>
                <CardBody textAlign="center" p={8}>
                  <VStack spacing={6}>
                    <VStack spacing={2}>
                      <Heading size="lg">Enterprise</Heading>
                      <Text fontSize="3xl" fontWeight="bold">₱4,990</Text>
                      <Text color="gray.600">per month</Text>
                    </VStack>
                    <VStack spacing={2} align="start">
                      <Text>• Unlimited listings</Text>
                      <Text>• Priority support</Text>
                      <Text>• API access</Text>
                      <Text>• Custom branding</Text>
                      <Text>• Advanced analytics</Text>
                    </VStack>
                    <Button as={Link} href="/contact" variant="outline" size="lg" w="full">
                      Contact Sales
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box bg="primary.600" color="white" py={20}>
        <Container maxW="container.xl">
          <VStack spacing={6} textAlign="center">
            <Heading size="xl">Ready to Get Started?</Heading>
            <Text fontSize="lg" maxW="2xl">
              Join hundreds of property owners who are already using ListSpace PH to manage their commercial properties
            </Text>
            <Button as={Link} href="/auth/signup" size="lg" colorScheme="white" variant="solid">
              Create Your Free Account
            </Button>
          </VStack>
        </Container>
      </Box>
    </Box>
  )
}
