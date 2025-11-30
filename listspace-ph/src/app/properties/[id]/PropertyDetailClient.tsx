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
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Property } from '@/services/propertyService'
import { propertyService } from '@/services/propertyService'
import { route } from '@/utils/routing';

export default function PropertyDetailClient({ id }: { id: string }) {
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    if (id && !isLoadingRef.current) {
      isLoadingRef.current = true
      loadProperty(id)
    }
  }, [id])

  // Update currentImageIndex when property loads to respect defaultImageIndex
  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      const defaultIndex = property.defaultImageIndex || 0
      if (defaultIndex < property.images.length) {
        setCurrentImageIndex(defaultIndex)
      }
    }
  }, [property])

  const loadProperty = async (propId: string) => {
    try {
      setLoading(true)
      setError('')
      const result = await propertyService.getPublicProperty(propId)
      if (result) {
        setProperty(result)
      } else {
        setError('Property not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load property')
    } finally {
      setLoading(false)
      isLoadingRef.current = false
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
      'office-space': 'blue',
      'retail-space': 'green',
      'warehouse': 'orange',
      'co-working': 'purple',
      'executive-suite': 'red',
      'home-office': 'cyan',
    }
    return colors[type as keyof typeof colors] || 'gray'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'green',
      'under-contract': 'yellow',
      'off-market': 'red',
      maintenance: 'orange',
    }
    return colors[status as keyof typeof colors] || 'gray'
  }


  const handleEmail = () => {
    if (property?.contactInfo?.email && property?.title) {
      window.open(`mailto:${property.contactInfo.email}?subject=Inquiry about ${property.title}`, '_self')
    }
  }

  const handleContact = () => {
    if (property?.contactInfo?.phone) {
      window.open(`tel:${property.contactInfo.phone}`, '_self')
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
        <Button as={Link} href={route('/properties')} leftIcon={<Icon as={ArrowLeft} />} mt={4}>
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
          href={route('/properties')}
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
              src={property?.images?.[currentImageIndex] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZjBmMCIvPgogIDxyZWN0IHg9IjE1MCIgeT0iMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2QwZDBkMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjAwLDEyMCAxODAsMTQwIDE4MCwxNjAgMjIwLDE2MCAyMjAsMTQwIiBmaWxsPSIjYTBhMGEwIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIyMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiI+UHJvcGVydHkgSW1hZ2U8L3RleHQ+Cjwvc3ZnPg=='}
              alt={property?.title || 'Property'}
              borderRadius="lg"
              objectFit="cover"
            />
          </AspectRatio>
          
          {property?.images && property.images.length > 1 && (
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
                    alt={`${property?.title || 'Property'} - Image ${index + 1}`}
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
                  <Badge colorScheme={getPropertyTypeColor(property?.type || '')} textTransform="capitalize">
                    {property?.type || 'N/A'}
                  </Badge>
                  <Badge colorScheme={getStatusColor(property?.status || '')} textTransform="capitalize">
                    {property?.status || 'N/A'}
                  </Badge>
                  <Spacer />
                  <HStack spacing={2} color="gray.500" fontSize="sm">
                    <Icon as={Eye} boxSize={4} />
                    <Text>{property?.viewCount} views</Text>
                  </HStack>
                </HStack>

                <Heading size="xl" mb={2}>
                  {property?.title || 'Property Title'}
                </Heading>

                <HStack spacing={2} color="gray.600" mb={4}>
                  <Icon as={MapPin} boxSize={5} />
                  <Text fontSize="lg">{property.location?.address || 'Address not available'}</Text>
                </HStack>

                <Text fontSize="3xl" fontWeight="bold" color="primary.600">
                  {formatPrice(property.price || 0)}
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
                    <Text fontWeight="medium">{property.features?.area || 0} sqm</Text>
                    <Text fontSize="sm" color="gray.500">Floor Area</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Icon as={Car} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.features?.parking || 0}</Text>
                    <Text fontSize="sm" color="gray.500">Parking Slots</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Icon as={Building} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.features?.floors || 0}</Text>
                    <Text fontSize="sm" color="gray.500">Floors</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Icon as={MapPin} boxSize={6} color="primary.500" />
                    <Text fontWeight="medium">{property.location?.city || 'N/A'}</Text>
                    <Text fontSize="sm" color="gray.500">City</Text>
                  </VStack>
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Features & Amenities */}
              <Box>
                <Heading size="md" mb={4}>Features & Amenities</Heading>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                  {property.features?.furnished && (
                    <HStack spacing={3}>
                      <Icon as={Sofa} boxSize={5} color="green.500" />
                      <Text>Furnished</Text>
                    </HStack>
                  )}
                  {property.features?.aircon && (
                    <HStack spacing={3}>
                      <Icon as={Snowflake} boxSize={5} color="blue.500" />
                      <Text>Air Conditioning</Text>
                    </HStack>
                  )}
                  {property.features?.wifi && (
                    <HStack spacing={3}>
                      <Icon as={Wifi} boxSize={5} color="purple.500" />
                      <Text>WiFi Included</Text>
                    </HStack>
                  )}
                  {property.features?.security && (
                    <HStack spacing={3}>
                      <Icon as={Shield} boxSize={5} color="red.500" />
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
                  {property.description || 'No description available'}
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
                    <Heading size="md">{property.contactInfo?.name || 'Contact not available'}</Heading>
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
                      <Text fontWeight="medium">{property.contactInfo?.phone || 'N/A'}</Text>
                    </HStack>
                    <HStack justify="space-between" w="full">
                      <Text color="gray.500">Email:</Text>
                      <Text fontWeight="medium" fontSize="xs">{property.contactInfo?.email || 'N/A'}</Text>
                    </HStack>
                  </VStack>

                  <Divider />

                  <VStack spacing={2} w="full" fontSize="sm" color="gray.500">
                    <Text>Property ID: {property.id || 'N/A'}</Text>
                    <Text>Listed: {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : 'N/A'}</Text>
                    <Text>Updated: {property.updatedAt ? new Date(property.updatedAt).toLocaleDateString() : 'N/A'}</Text>
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
