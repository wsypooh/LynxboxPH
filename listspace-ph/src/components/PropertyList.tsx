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
  Input,
  Select,
  InputGroup,
  InputLeftElement,
  Checkbox,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { Filter } from 'lucide-react';
import { Property, propertyService } from '@/services/propertyService';
import { EditIcon, DeleteIcon, ViewIcon, PlusSquareIcon } from '@chakra-ui/icons';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { PropertyStatusUpdater } from './PropertyStatusUpdater';

interface PropertyListProps {
  onEdit?: (property: Property) => void;
  onView?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onAddNew?: () => void;
  refreshTrigger?: number;
}

interface FilterState {
  search: string;
  type: string;
  status: string;
  sortBy: string;
  sortOrder: string;
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  features: {
    parking: boolean;
    furnished: boolean;
    aircon: boolean;
    wifi: boolean;
    security: boolean;
  };
}

const STORAGE_KEY = 'property-list-filters';

const defaultFilters: FilterState = {
  search: '',
  type: '',
  status: '',
  sortBy: 'date',
  sortOrder: 'desc',
  priceMin: 0,
  priceMax: 1000000,
  areaMin: 0,
  areaMax: 1000,
  features: {
    parking: false,
    furnished: false,
    aircon: false,
    wifi: false,
    security: false,
  },
};

export function PropertyList({
  onEdit,
  onView,
  onDelete,
  onAddNew,
  refreshTrigger = 0,
}: PropertyListProps) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastKey, setLastKey] = useState<string | undefined>();
  const toast = useToast();
  
  // Filter and sort state - initialize from localStorage if available
  const initializeFilters = (): FilterState => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        // Merge saved filters with defaults to ensure all properties exist
        return { ...defaultFilters, ...parsed };
      }
    } catch (error) {
      console.error('Error loading filters from localStorage during init:', error);
    }
    return defaultFilters;
  };
  
  const [filters, setFilters] = useState<FilterState>(initializeFilters);
  const { isOpen: isFilterOpen, onToggle: onFilterToggle } = useDisclosure();
  
  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters]);

  const fetchProperties = useCallback(async (append = false) => {
    try {
      setLoading(true);
      setError(null);

      // Build search params based on filters
      const params: any = {
        limit: 10,
        lastKey: append ? lastKey : undefined,
      };
      
      // Add search query
      if (filters.search.trim()) {
        // Use search endpoint for text search
        const searchResponse = await propertyService.searchUserProperties(
          filters.search.trim(),
          params.limit
        );
        
        const allProperties = searchResponse.items || [];
        
        // Apply additional filters on client side for now
        let filteredProperties = allProperties;
        
        // Filter by type
        if (filters.type) {
          filteredProperties = filteredProperties.filter(p => p.type === filters.type);
        }
        
        // Filter by status
        if (filters.status) {
          filteredProperties = filteredProperties.filter(p => p.status === filters.status);
        }
        
        // Filter by price range
        filteredProperties = filteredProperties.filter(p => 
          p.price >= filters.priceMin && p.price <= filters.priceMax
        );
        
        // Filter by area range
        filteredProperties = filteredProperties.filter(p => 
          p.features.area >= filters.areaMin && p.features.area <= filters.areaMax
        );
        
        // Filter by features
        if (filters.features.parking) {
          filteredProperties = filteredProperties.filter(p => p.features.parking > 0);
        }
        if (filters.features.furnished) {
          filteredProperties = filteredProperties.filter(p => p.features.furnished);
        }
        if (filters.features.aircon) {
          filteredProperties = filteredProperties.filter(p => p.features.aircon);
        }
        if (filters.features.wifi) {
          filteredProperties = filteredProperties.filter(p => p.features.wifi);
        }
        if (filters.features.security) {
          filteredProperties = filteredProperties.filter(p => p.features.security);
        }
        
        // Apply sorting
        filteredProperties.sort((a, b): number => {
          let aValue: number | string;
          let bValue: number | string;
          
          switch (filters.sortBy) {
            case 'price':
              aValue = a.price as number;
              bValue = b.price as number;
              break;
            case 'area':
              aValue = a.features.area as number;
              bValue = b.features.area as number;
              break;
            case 'views':
              aValue = (a.viewCount || 0) as number;
              bValue = (b.viewCount || 0) as number;
              break;
            case 'date':
            default:
              aValue = new Date(a.createdAt).getTime() as number;
              bValue = new Date(b.createdAt).getTime() as number;
              break;
          }
          
          // Since all our sort fields are numeric, we can use numeric comparison
          return filters.sortOrder === 'asc' 
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
        });
        
        if (append) {
          setProperties(prev => [...prev, ...filteredProperties]);
        } else {
          setProperties(filteredProperties);
        }
        
        setHasMore(false); // Search doesn't support pagination for now
        setLastKey(undefined);
      } else {
        // Use regular list endpoint with filters
        if (filters.type) params.type = filters.type;
        if (filters.sortBy) params.sortBy = filters.sortBy;
        if (filters.sortOrder) params.sortOrder = filters.sortOrder;
        
        const response = await propertyService.listProperties(params);
        let allProperties = response.items || [];
        
        // Apply additional filters that aren't supported by the API yet
        if (filters.status) {
          allProperties = allProperties.filter(p => p.status === filters.status);
        }
        
        // Filter by price range
        allProperties = allProperties.filter(p => 
          p.price >= filters.priceMin && p.price <= filters.priceMax
        );
        
        // Filter by area range
        allProperties = allProperties.filter(p => 
          p.features.area >= filters.areaMin && p.features.area <= filters.areaMax
        );
        
        // Filter by features
        if (filters.features.parking) {
          allProperties = allProperties.filter(p => p.features.parking > 0);
        }
        if (filters.features.furnished) {
          allProperties = allProperties.filter(p => p.features.furnished);
        }
        if (filters.features.aircon) {
          allProperties = allProperties.filter(p => p.features.aircon);
        }
        if (filters.features.wifi) {
          allProperties = allProperties.filter(p => p.features.wifi);
        }
        if (filters.features.security) {
          allProperties = allProperties.filter(p => p.features.security);
        }
        
        if (append) {
          setProperties(prev => [...prev, ...allProperties]);
        } else {
          setProperties(allProperties);
        }
        
        setHasMore(!!response.lastKey);
        setLastKey(response.lastKey);
      }
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
  }, [lastKey, toast, filters]);

  useEffect(() => {
    fetchProperties();
  }, [refreshTrigger, fetchProperties]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleFeatureChange = (feature: keyof FilterState['features'], value: boolean) => {
    setFilters(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value,
      },
    }));
  };
  
  const clearFilters = () => {
    setFilters(defaultFilters);
  };
  
  const hasActiveFilters = filters.search || 
    filters.type || 
    filters.status || 
    filters.priceMin > defaultFilters.priceMin || 
    filters.priceMax < defaultFilters.priceMax ||
    filters.areaMin > defaultFilters.areaMin || 
    filters.areaMax < defaultFilters.areaMax ||
    Object.values(filters.features).some(v => v);
  
  const handleStatusUpdate = (updatedProperty: Property) => {
    // Update the property in the local state
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

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
      
      {/* Search and Filter Controls */}
      <VStack spacing={4} align="stretch">
        {/* Search Bar */}
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search properties by title, description, or location..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            bg="white"
          />
        </InputGroup>
        
        {/* Quick Filters and Sort */}
        <HStack spacing={4} wrap="wrap">
          <Select
            placeholder="Property Type"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            maxW="200px"
            bg="white"
          >
            <option value="office">Office</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
          </Select>
          
          <Select
            placeholder="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            maxW="150px"
            bg="white"
          >
            <option value="available">Available</option>
            <option value="rented">Rented</option>
            <option value="sold">Sold</option>
            <option value="maintenance">Maintenance</option>
          </Select>
          
          <Select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            maxW="150px"
            bg="white"
          >
            <option value="date">Date</option>
            <option value="price">Price</option>
            <option value="area">Area</option>
            <option value="views">Views</option>
          </Select>
          
          <Select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            maxW="120px"
            bg="white"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
          
          <Button
            leftIcon={<Filter size={16} />}
            variant="outline"
            onClick={onFilterToggle}
            rightIcon={isFilterOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            Advanced Filters
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              colorScheme="red"
              size="sm"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          )}
        </HStack>
        
        {/* Advanced Filters */}
        <Collapse in={isFilterOpen} animateOpacity>
          <Box
            p={4}
            bg="gray.50"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
          >
            <VStack spacing={4} align="stretch">
              {/* Price Range */}
              <Box>
                <Text fontWeight="medium" mb={2}>Price Range (PHP)</Text>
                <HStack spacing={4} align="center">
                  <NumberInput
                    value={filters.priceMin}
                    onChange={(value) => handleFilterChange('priceMin', Number(value) || 0)}
                    min={0}
                    max={filters.priceMax}
                  >
                    <NumberInputField placeholder="Min" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text>to</Text>
                  <NumberInput
                    value={filters.priceMax}
                    onChange={(value) => handleFilterChange('priceMax', Number(value) || 0)}
                    min={filters.priceMin}
                  >
                    <NumberInputField placeholder="Max" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
              </Box>
              
              {/* Area Range */}
              <Box>
                <Text fontWeight="medium" mb={2}>Area Range (m²)</Text>
                <HStack spacing={4} align="center">
                  <NumberInput
                    value={filters.areaMin}
                    onChange={(value) => handleFilterChange('areaMin', Number(value) || 0)}
                    min={0}
                    max={filters.areaMax}
                  >
                    <NumberInputField placeholder="Min" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text>to</Text>
                  <NumberInput
                    value={filters.areaMax}
                    onChange={(value) => handleFilterChange('areaMax', Number(value) || 0)}
                    min={filters.areaMin}
                  >
                    <NumberInputField placeholder="Max" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
              </Box>
              
              {/* Features */}
              <Box>
                <Text fontWeight="medium" mb={2}>Features</Text>
                <HStack spacing={4} wrap="wrap">
                  <Checkbox
                    isChecked={filters.features.parking}
                    onChange={(e) => handleFeatureChange('parking', e.target.checked)}
                  >
                    Parking Available
                  </Checkbox>
                  <Checkbox
                    isChecked={filters.features.furnished}
                    onChange={(e) => handleFeatureChange('furnished', e.target.checked)}
                  >
                    Furnished
                  </Checkbox>
                  <Checkbox
                    isChecked={filters.features.aircon}
                    onChange={(e) => handleFeatureChange('aircon', e.target.checked)}
                  >
                    Air Conditioning
                  </Checkbox>
                  <Checkbox
                    isChecked={filters.features.wifi}
                    onChange={(e) => handleFeatureChange('wifi', e.target.checked)}
                  >
                    WiFi
                  </Checkbox>
                  <Checkbox
                    isChecked={filters.features.security}
                    onChange={(e) => handleFeatureChange('security', e.target.checked)}
                  >
                    Security
                  </Checkbox>
                </HStack>
              </Box>
            </VStack>
          </Box>
        </Collapse>
      </VStack>

      <Grid
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
        }}
        gap={6}
      >
        {(properties || []).map((property) => (
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

                {/* Quick Status Update */}
                <Box w="full">
                  <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
                    Quick Status Update:
                  </Text>
                  <PropertyStatusUpdater 
                    property={property} 
                    onStatusUpdate={handleStatusUpdate}
                  />
                </Box>

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
      
      {/* Show active filters summary */}
      {hasActiveFilters && (
        <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
          <Text fontSize="sm" color="blue.800">
            <strong>Active filters:</strong> {filters.search && `Search: "${filters.search}" `}
            {filters.type && `Type: ${filters.type} `}
            {filters.status && `Status: ${filters.status} `}
            {filters.priceMin > defaultFilters.priceMin && `Price: ₱${filters.priceMin.toLocaleString()}+ `}
            {filters.priceMax < defaultFilters.priceMax && `Price: <₱${filters.priceMax.toLocaleString()} `}
            {filters.areaMin > defaultFilters.areaMin && `Area: ${filters.areaMin}m²+ `}
            {filters.areaMax < defaultFilters.areaMax && `Area: <${filters.areaMax}m² `}
            {filters.features.parking && 'Parking '}
            {filters.features.furnished && 'Furnished '}
            {filters.features.aircon && 'Aircon '}
            {filters.features.wifi && 'WiFi '}
            {filters.features.security && 'Security '}
          </Text>
        </Box>
      )}
    </VStack>
  );
}
