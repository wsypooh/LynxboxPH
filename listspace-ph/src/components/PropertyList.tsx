'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardBody,
  Image,
  Text,
  Heading,
  Stack,
  Badge,
  Button,
  Flex,
  Grid,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  HStack,
  VStack,
  Divider,
  IconButton,
} from '@chakra-ui/react';
import { Property, propertyService } from '@/services/propertyService';
import { EditIcon, DeleteIcon, ViewIcon, PlusSquareIcon } from '@chakra-ui/icons';
import { formatCurrency } from '@/lib/utils';

interface PropertyListProps {
  onEdit?: (property: Property) => void;
  onView?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onAddNew?: () => void;
  refreshTrigger?: number;
}

export function PropertyList({
  onEdit,
  onView,
  onDelete,
  onAddNew,
  refreshTrigger = 0,
}: PropertyListProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastKey, setLastKey] = useState<string | undefined>();
  const toast = useToast();

  const fetchProperties = useCallback(async (append = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await propertyService.listProperties({
        limit: 10,
        lastKey: append ? lastKey : undefined,
      });

      if (append) {
        setProperties(prev => [...prev, ...response.items]);
      } else {
        setProperties(response.items);
      }

      setHasMore(!!response.lastKey);
      setLastKey(response.lastKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to fetch properties',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [lastKey, toast]);

  useEffect(() => {
    fetchProperties();
  }, [refreshTrigger, fetchProperties]);

  const handleDelete = async (property: Property) => {
    if (!onDelete) return;

    try {
      await propertyService.deleteProperty(property.id);
      onDelete(property);
      setProperties(prev => prev.filter(p => p.id !== property.id));
      
      // Don't show toast here - let the parent component handle it
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete property',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchProperties(true);
    }
  };

  if (loading && properties.length === 0) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading properties...</Text>
        </VStack>
      </Flex>
    );
  }

  if (error && properties.length === 0) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (properties.length === 0 && !loading) {
    return (
      <VStack spacing={6} py={12}>
        <Box textAlign="center">
          <Heading size="lg" mb={2}>No properties found</Heading>
          <Text color="gray.600">Get started by adding your first property</Text>
        </Box>
        {onAddNew && (
          <Button
            leftIcon={<PlusSquareIcon />}
            colorScheme="blue"
            onClick={onAddNew}
          >
            Add Property
          </Button>
        )}
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="lg">Properties ({properties.length})</Heading>
        {onAddNew && (
          <Button
            leftIcon={<PlusSquareIcon />}
            colorScheme="blue"
            onClick={onAddNew}
          >
            Add Property
          </Button>
        )}
      </Flex>

      <Grid
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
        }}
        gap={6}
      >
        {properties.map((property) => (
          <Card key={property.id} borderRadius="lg" overflow="hidden" boxShadow="md">
            <Box position="relative">
              {property.images.length > 0 ? (
                <Image
                  src={property.images[property.defaultImageIndex ?? 0]}
                  alt={property.title}
                  h="200px"
                  w="100%"
                  objectFit="cover"
                  fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+PC9zdmc+"
                />
              ) : (
                <Box h="200px" bg="gray.200" display="flex" alignItems="center" justifyContent="center">
                  <Text color="gray.500">No image</Text>
                </Box>
              )}
              <Badge
                position="absolute"
                top={2}
                right={2}
                colorScheme={property.status === 'available' ? 'green' : 'orange'}
              >
                {property.status}
              </Badge>
            </Box>

            <CardBody>
              <VStack align="start" spacing={3}>
                <Heading size="md" noOfLines={2}>
                  {property.title}
                </Heading>

                <Badge colorScheme="blue" variant="outline">
                  {property.type}
                </Badge>

                <Text color="blue.600" fontSize="xl" fontWeight="bold">
                  {formatCurrency(property.price, property.currency)}
                </Text>

                <Text noOfLines={2} color="gray.600">
                  {property.description}
                </Text>

                <Text fontSize="sm" color="gray.500">
                  📍 {property.location.address}, {property.location.city}
                </Text>

                <HStack spacing={2} fontSize="xs" color="gray.600">
                  {property.features.area && (
                    <Text>📐 {property.features.area}m²</Text>
                  )}
                  {property.features.parking > 0 && (
                    <Text>🚗 {property.features.parking} parking</Text>
                  )}
                  {property.features.furnished && (
                    <Text>🪑 Furnished</Text>
                  )}
                </HStack>

                <Divider />

                <HStack spacing={2} w="full" justify="space-between">
                  <Button
                    leftIcon={<ViewIcon />}
                    size="sm"
                    variant="outline"
                    onClick={() => onView?.(property)}
                    flex={1}
                  >
                    View
                  </Button>
                  <Button
                    leftIcon={<EditIcon />}
                    size="sm"
                    colorScheme="blue"
                    onClick={() => {
                      console.log('Edit button clicked for property:', property);
                      console.log('onEdit function:', onEdit);
                      onEdit?.(property);
                    }}
                    flex={1}
                  >
                    Edit
                  </Button>
                  <IconButton
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => handleDelete(property)}
                    aria-label="Delete property"
                  />
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {hasMore && (
        <Flex justify="center" py={4}>
          <Button
            onClick={loadMore}
            isLoading={loading}
            disabled={loading}
            variant="outline"
          >
            Load More
          </Button>
        </Flex>
      )}
    </VStack>
  );
}
