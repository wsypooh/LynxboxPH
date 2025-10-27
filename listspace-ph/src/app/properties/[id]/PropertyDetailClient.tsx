"use client"

import {
  Container,
  Box,
  Image,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Flex,
  Spacer,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  AspectRatio,
} from '@chakra-ui/react'
import {
  MapPin,
  Square,
  Car,
  Eye,
  Phone,
  Mail,
  Wifi,
  Shield,
  Snowflake,
  Sofa,
  Building,
  ArrowLeft,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Property } from '@/features/properties/types'
import { PropertyService } from '@/features/properties/services/propertyService'

export default function PropertyDetailClient({ id }: { id: string }) {
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (id) {
      loadProperty(id)
    }
  }, [id])

  const loadProperty = async (propId: string) => {
    try {
      setLoading(true)
      setError('')
      const result = await PropertyService.getPropertyById(propId)
      if (result) {
        setProperty(result)
      } else {
        setError('Property not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load property')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getPropertyTypeColor = (type: string) => {
    const colors = {
      office: 'blue',
      warehouse: 'orange',
      retail: 'green',
      restaurant: 'red',
      industrial: 'gray',
      'mixed-use': 'purple',
    }
    return colors[type as keyof typeof colors] || 'gray'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'green',
      rented: 'red',
      pending: 'yellow',
      maintenance: 'gray',
    }
    return colors[status as keyof typeof colors] || 'gray'
  }

  const handleContact = () => {
    if (property) {
      window.open(`tel:${property.contactInfo.phone}`, '_self')
    }
  }

  const handleEmail = () => {
    if (property) {
      window.open(`mailto:${property.contactInfo.email}?subject=Inquiry about ${property.title}`, '_self')
    }
  }

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="lg" color="primary.500" />
        </Flex>
      </Container>
    )
  }

  if (error || !property) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          {error || 'Property not found'}
        </Alert>
        <Button as={Link} href="/properties" leftIcon={<Icon as={ArrowLeft} />} mt={4}>
          Back to Properties
        </Button>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Back Button */}
        <Button
          as={Link}
          href="/properties"
          leftIcon={<Icon as={ArrowLeft} />}
          variant="ghost"
          alignSelf="flex-start"
        >
          Back to Properties
        </Button>

        {/* Property Images */}
        <Box>
          <AspectRatio ratio={16 / 9} mb={4}>
            <Image
              src={property.images[currentImageIndex] || '/images/placeholder-property.jpg'}
              alt={property.title}
              borderRadius="lg"
              objectFit="cover"
            />
          </AspectRatio>
          
          {property.images.length > 1 && (
            <HStack spacing={2} overflowX="auto" pb={2}>
              {property.images.map((image, index) => (
                <Box
                  key={index}
                  minW="80px"
                  h="60px"
                  cursor="pointer"
                  onClick={() => setCurrentImageIndex(index)}
                  border={currentImageIndex === index ? '2px solid' : '1px solid'}
                  borderColor={currentImageIndex === index ? 'primary.500' : 'gray.200'}
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Image
                    src={image}
                    alt={`${property.title} - Image ${index + 1}`}
                    w="full"
                    h="full"
                    objectFit="cover"
                  />
                </Box>
              ))}
            </HStack>
          )}
        </Box>

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
          {/* Main Content */}
          <Box gridColumn={{ base: 1, lg: '1 / 3' }}>
            <VStack spacing={6} align="stretch">
              {/* Property Header */}
              <Box>
                <HStack spacing={3} mb={4}>
                  <Badge colorScheme={getPropertyTypeColor(property.type)} textTransform="capitalize">
                    {property.type}
                  </Badge>
                  <Badge colorScheme={getStatusColor(property.status)} textTransform="capitalize">
                    {property.status}
                  </Badge>
                  <Spacer />
                  <HStack spacing={2} color="gray.500" fontSize="sm">
                    <Icon as={Eye} boxSize={4} />
                    <Text>{property.viewCount} views</Text>
                  </HStack>
                </HStack>

                <Heading size="xl" mb={2}>
                  {property.title}
                </Heading>

                <HStack spacing={2} color="gray.600" mb={4}>
                  <Icon as={MapPin} boxSize={5} />
                  <Text fontSize="lg">{property.location.address}</Text>
                </HStack>

                <Text fontSize="3xl" fontWeight="bold" color="primary.600">
                  {formatPrice(property.price)}
                  <Text as="span" fontSize="lg" fontWeight="normal" color="gray.500" ml={2}>
                    per month
                  </Text>
                </Text>
              </Box>

              <Divider />

              {/* Property Details */}
              <Box>
                <Heading size="md" mb={4}>Property Details</Heading>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <VStack spacing={1}>
                    <Icon as={Square} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.features.area} sqm</Text>
                    <Text fontSize="sm" color="gray.500">Floor Area</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Icon as={Car} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.features.parking}</Text>
                    <Text fontSize="sm" color="gray.500">Parking Slots</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Icon as={Building} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.features.floors}</Text>
                    <Text fontSize="sm" color="gray.500">Floors</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Icon as={MapPin} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.location.city}</Text>
                    <Text fontSize="sm" color="gray.500">Location</Text>
                  </VStack>
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Features & Amenities */}
              <Box>
                <Heading size="md" mb={4}>Features & Amenities</Heading>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                  {property.features.furnished && (
                    <HStack spacing={3}>
                      <Icon as={Sofa} boxSize={5} color="green.500" />
                      <Text>Furnished</Text>
                    </HStack>
                  )}
                  {property.features.aircon && (
                    <HStack spacing={3}>
                      <Icon as={Snowflake} boxSize={5} color="blue.500" />
                      <Text>Air Conditioning</Text>
                    </HStack>
                  )}
                  {property.features.wifi && (
                    <HStack spacing={3}>
                      <Icon as={Wifi} boxSize={5} color="purple.500" />
                      <Text>WiFi Included</Text>
                    </HStack>
                  )}
                  {property.features.security && (
                    <HStack spacing={3}>
                      <Icon as={Shield} boxSize={5} color="orange.500" />
                      <Text>24/7 Security</Text>
                    </HStack>
                  )}
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Description */}
              <Box>
                <Heading size="md" mb={4}>Description</Heading>
                <Text lineHeight="tall" color="gray.700">
                  {property.description}
                </Text>
              </Box>
            </VStack>
          </Box>

          {/* Contact Sidebar */}
          <Box>
            <Card position="sticky" top={8}>
              <CardBody>
                <VStack spacing={6}>
                  <VStack spacing={2} textAlign="center">
                    <Text fontSize="sm" color="gray.500">Listed by</Text>
                    <Heading size="md">{property.contactInfo.name}</Heading>
                  </VStack>

                  <VStack spacing={3} w="full">
                    <Button
                      leftIcon={<Icon as={Phone} />}
                      colorScheme="primary"
                      size="lg"
                      w="full"
                      onClick={handleContact}
                    >
                      Call Now
                    </Button>
                    <Button
                      leftIcon={<Icon as={Mail} />}
                      variant="outline"
                      colorScheme="primary"
                      size="lg"
                      w="full"
                      onClick={handleEmail}
                    >
                      Send Email
                    </Button>
                  </VStack>

                  <Divider />

                  <VStack spacing={3} w="full" fontSize="sm">
                    <HStack justify="space-between" w="full">
                      <Text color="gray.500">Phone:</Text>
                      <Text fontWeight="medium">{property.contactInfo.phone}</Text>
                    </HStack>
                    <HStack justify="space-between" w="full">
                      <Text color="gray.500">Email:</Text>
                      <Text fontWeight="medium" fontSize="xs">{property.contactInfo.email}</Text>
                    </HStack>
                  </VStack>

                  <Divider />

                  <VStack spacing={2} w="full" fontSize="sm" color="gray.500">
                    <Text>Property ID: {property.id}</Text>
                    <Text>Listed: {new Date(property.createdAt).toLocaleDateString()}</Text>
                    <Text>Updated: {new Date(property.updatedAt).toLocaleDateString()}</Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </Box>
        </SimpleGrid>
      </VStack>
    </Container>
  )
}
