'use client'

import {
  Card,
  CardBody,
  Image,
  Stack,
  Heading,
  Text,
  Button,
  Badge,
  HStack,
  VStack,
  Icon,
  Box,
  Flex,
  Spacer,
} from '@chakra-ui/react'
import { MapPin, Square, Car, Eye, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import { Property } from '../types'

interface PropertyCardProps {
  property: Property
  onContact?: (property: Property) => void
}

export function PropertyCard({ property, onContact }: PropertyCardProps) {
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

  return (
    <Card maxW="sm" overflow="hidden" shadow="md" _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s">
      <Box position="relative">
        <Image
          src={property.images[0] || '/images/placeholder-property.jpg'}
          alt={property.title}
          h="200px"
          w="full"
          objectFit="cover"
        />
        <Badge
          position="absolute"
          top={2}
          left={2}
          colorScheme={getPropertyTypeColor(property.type)}
          textTransform="capitalize"
        >
          {property.type}
        </Badge>
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorScheme={getStatusColor(property.status)}
          textTransform="capitalize"
        >
          {property.status}
        </Badge>
      </Box>

      <CardBody>
        <Stack spacing={3}>
          <VStack align="start" spacing={2}>
            <Heading size="md" noOfLines={2}>
              {property.title}
            </Heading>
            <Text color="gray.600" fontSize="sm" noOfLines={2}>
              {property.description}
            </Text>
          </VStack>

          <HStack spacing={2} color="gray.500" fontSize="sm">
            <Icon as={MapPin} boxSize={4} />
            <Text noOfLines={1}>{property.location.city}, {property.location.province}</Text>
          </HStack>

          <HStack spacing={4} fontSize="sm" color="gray.600">
            <HStack spacing={1}>
              <Icon as={Square} boxSize={4} />
              <Text>{property.features.area} sqm</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={Car} boxSize={4} />
              <Text>{property.features.parking} parking</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={Eye} boxSize={4} />
              <Text>{property.viewCount} views</Text>
            </HStack>
          </HStack>

          <Flex align="center">
            <VStack align="start" spacing={0}>
              <Text fontSize="2xl" fontWeight="bold" color="primary.600">
                {formatPrice(property.price)}
              </Text>
              <Text fontSize="sm" color="gray.500">per month</Text>
            </VStack>
            <Spacer />
          </Flex>

          <HStack spacing={2}>
            <Button
              as={Link}
              href={`/properties/${property.id}`}
              size="sm"
              variant="outline"
              colorScheme="primary"
              flex={1}
            >
              View Details
            </Button>
            <Button
              size="sm"
              colorScheme="primary"
              leftIcon={<Icon as={Phone} />}
              onClick={() => onContact?.(property)}
            >
              Contact
            </Button>
          </HStack>

          <VStack align="start" spacing={1} pt={2} borderTop="1px" borderColor="gray.200">
            <Text fontSize="xs" color="gray.500">Listed by:</Text>
            <Text fontSize="sm" fontWeight="medium">{property.contactInfo.name}</Text>
          </VStack>
        </Stack>
      </CardBody>
    </Card>
  )
}
