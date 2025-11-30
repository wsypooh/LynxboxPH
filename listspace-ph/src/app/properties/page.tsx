'use client'

import {
  Container,
  Heading,
  VStack,
  HStack,
  Input,
  Button,
  Select,
  SimpleGrid,
  Text,
  Box,
  Flex,
  Spacer,
  Spinner,
  Alert,
  AlertIcon,
  InputGroup,
  InputLeftElement,
  Icon,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Checkbox,
  Stack,
} from '@chakra-ui/react'
import { Search, Filter, MapPin, Building2, X, Plus } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { PropertyCard } from '@/features/properties/components/PropertyCard'
import { propertyService } from '@/services/propertyService'
import { Property, PropertyType } from '@/services/propertyService'

// Define search params interface since we're not using the mock types
interface FilterState {
  type?: PropertyType[];
  priceMin?: number;
  priceMax?: number;
  minArea?: number;
  maxArea?: number;
  location?: string;
  features?: {
    parking?: boolean;
    furnished?: boolean;
    aircon?: boolean;
    wifi?: boolean;
    security?: boolean;
  };
}

interface PropertySearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'area' | 'date' | 'views';
  sortOrder?: 'asc' | 'desc';
  filters?: FilterState;
}

export default function PropertiesPage() {
  const STORAGE_KEY = 'public-properties-filters';
  
  // Initialize search params from localStorage
  const initializeSearchParams = (): PropertySearchParams => {
    try {
      const savedParams = localStorage.getItem(STORAGE_KEY);
      if (savedParams) {
        const parsed = JSON.parse(savedParams);
        return {
          page: 1,
          limit: 12,
          sortBy: 'date',
          sortOrder: 'desc',
          ...parsed
        };
      }
    } catch (error) {
      console.error('Error loading search params from localStorage:', error);
    }
    return {
      page: 1,
      limit: 12,
      sortBy: 'date',
      sortOrder: 'desc'
    };
  };
  
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useState<PropertySearchParams>(initializeSearchParams)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const { isOpen: isFilterOpen, onOpen: onFilterOpen, onClose: onFilterClose } = useDisclosure()
  
  // Save search params to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(searchParams));
    } catch (error) {
      console.error('Error saving search params to localStorage:', error);
    }
  }, [searchParams]);

  const hasActiveFilters = useCallback((): boolean => {
    const currentFilters = searchParams.filters;
    if (!currentFilters || Object.keys(currentFilters).length === 0) {
      return false;
    }
    
    const hasTypeFilter = Boolean(currentFilters.type?.length);
    const hasPriceFilters = currentFilters.priceMin !== undefined || currentFilters.priceMax !== undefined;
    const hasAreaFilters = currentFilters.minArea !== undefined || currentFilters.maxArea !== undefined;
    const hasLocationFilter = Boolean(currentFilters.location);
    const hasFeatureFilters = currentFilters.features ? 
      Object.values(currentFilters.features).some((value): value is boolean => value === true) : 
      false;
    
    return hasTypeFilter || hasPriceFilters || hasAreaFilters || hasLocationFilter || hasFeatureFilters;
  }, [searchParams.filters]);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Use the real API service
      let result;
      if (searchParams.filters && hasActiveFilters()) {
        // If there are active filters, use the filter API
        const filterData = {
          ...searchParams.filters,
          query: searchParams.query,
          limit: searchParams.limit,
          sortBy: searchParams.sortBy,
          sortOrder: searchParams.sortOrder
        };
        result = await propertyService.filterProperties(filterData);
        console.log('Filter result:', result);
        
        // Ensure result has items property
        const items = result?.items || [];
        setProperties(items);
        setTotal(items.length);
        setTotalPages(Math.ceil(items.length / (searchParams.limit || 12)));
      } else if (searchParams.query) {
        // If there's a search query but no filters, use search
        result = await propertyService.searchProperties(
          searchParams.query, 
          searchParams.limit,
          searchParams.sortBy,
          searchParams.sortOrder
        );
        console.log('Search result:', result);
        
        // Ensure result has items property
        const items = result?.items || [];
        setProperties(items);
        setTotal(items.length);
        setTotalPages(Math.ceil(items.length / (searchParams.limit || 12)));
      } else {
        // Otherwise, list all available properties (public)
        const listResult = await propertyService.listPublicProperties({
          limit: searchParams.limit,
          sortBy: searchParams.sortBy,
          sortOrder: searchParams.sortOrder
        });
        console.log('Public list result:', listResult);
        
        // Ensure listResult has items property
        const items = listResult?.items || [];
        setProperties(items);
        setTotal(items.length);
        setTotalPages(Math.ceil(items.length / (searchParams.limit || 12)));
      }
    } catch (err: any) {
      console.error('Error loading properties:', err);
      setError(err.message || 'Failed to load properties')
      // Set empty array on error to prevent map undefined error
      setProperties([]);
    } finally {
      setLoading(false)
    }
  }, [searchParams, hasActiveFilters])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

  const handleSearch = (query: string) => {
    setSearchParams(prev => ({
      ...prev,
      query: query || undefined,
      page: 1
    }))
  }

  const handleSortChange = (sortBy: string) => {
    const [field, order] = sortBy.split('-')
    setSearchParams(prev => ({
      ...prev,
      sortBy: field as any,
      sortOrder: order as 'asc' | 'desc',
      page: 1
    }))
  }

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }))
  }

  const [filters, setFilters] = useState<FilterState>(
    typeof searchParams.filters === 'object' ? searchParams.filters : {}
  );

  const handleFilterChange = <K extends keyof FilterState>(
    field: K, 
    value: FilterState[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureToggle = (
    feature: keyof NonNullable<FilterState['features']>, 
    checked: boolean
  ) => {
    setFilters(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: checked
      }
    }));
  };

  const handleFilterApply = () => {
    setSearchParams(prev => ({
      ...prev,
      filters: JSON.parse(JSON.stringify(filters)), // Deep clone
      page: 1
    }));
    onFilterClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {};
    setFilters(clearedFilters);
    setSearchParams(prev => ({
      ...prev,
      filters: clearedFilters,
      page: 1
    }));
  };
  
  const clearAllFilters = () => {
    setSearchParams({
      page: 1,
      limit: 12,
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setFilters({});
  };

  const handleContact = (property: Property) => {
    // Open contact modal or redirect to contact form
    window.open(`tel:${property.contactInfo.phone}`, '_self')
  }

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'office', label: 'Office' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'land', label: 'Land' },
  ]

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" mb={6}>
          <Heading as="h1" size="xl">Available Properties</Heading>
        </HStack>
        <VStack spacing={4} textAlign="center">
          <Heading size="xl" display="flex" alignItems="center" gap={3}>
            <Icon as={Building2} color="primary.500" />
            Commercial Properties
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Find the perfect commercial space for your business
          </Text>
        </VStack>

        {/* Search and Filters */}
        <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
          <VStack spacing={4}>
            <HStack w="full" spacing={4}>
              <InputGroup flex={1}>
                <InputLeftElement>
                  <Icon as={Search} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search properties by title, location, or description..."
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </InputGroup>
              <Button
                leftIcon={<Icon as={Filter} />}
                variant="outline"
                onClick={onFilterOpen}
              >
                Filters
              </Button>
            </HStack>

            <HStack w="full" spacing={4} justify="space-between">
              <HStack spacing={4}>
                <Text fontSize="sm" color="gray.600">Sort by:</Text>
                <Select
                  size="sm"
                  w="200px"
                  value={`${searchParams.sortBy}-${searchParams.sortOrder}`}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="area-asc">Area: Small to Large</option>
                  <option value="area-desc">Area: Large to Small</option>
                  <option value="views-desc">Most Viewed</option>
                </Select>
              </HStack>

              {hasActiveFilters() && (
                <HStack spacing={2}>
                  <Button 
                    size="sm"
                    variant="outline"
                    colorScheme="gray"
                    onClick={handleClearFilters}
                    leftIcon={<X size={14} />}
                    border="1px solid"
                    borderColor="gray.300"
                    _hover={{
                      bg: 'gray.50',
                      transform: 'translateY(-1px)',
                      boxShadow: 'sm',
                      borderColor: 'gray.400'
                    }}
                    _active={{
                      bg: 'gray.100',
                      transform: 'translateY(0)',
                      borderColor: 'gray.400'
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={clearAllFilters}
                  >
                    Reset All
                  </Button>
                  <Badge colorScheme="primary" variant="solid">
                    {searchParams.filters ? Object.entries(searchParams.filters).filter(([key, value]) => {
                      if (!value) return false;
                      if (key === 'features') {
                        return Object.values(value).some((featureValue): featureValue is boolean => featureValue === true);
                      }
                      if (Array.isArray(value)) {
                        return value.length > 0;
                      }
                      return true;
                    }).length : 0} Active
                  </Badge>
                </HStack>
              )}
            </HStack>
          </VStack>
        </Box>

        {/* Results Summary */}
        <Flex align="center">
          <Text color="gray.600">
            {loading ? 'Loading...' : `Showing ${properties?.length || 0} of ${total} properties`}
          </Text>
          <Spacer />
          <Text fontSize="sm" color="gray.500">
            Page {searchParams.page} of {totalPages}
          </Text>
        </Flex>

        {/* Error State */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Flex justify="center" py={8}>
            <Spinner size="lg" color="primary.500" />
          </Flex>
        )}

        {/* Properties Grid */}
        {!loading && properties && properties.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={6}>
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onContact={handleContact}
              />
            ))}
          </SimpleGrid>
        )}

        {/* Empty State */}
        {!loading && (!properties || properties.length === 0) && !error && (
          <VStack spacing={4} py={12} textAlign="center">
            <Icon as={Building2} boxSize={16} color="gray.300" />
            <Heading size="md" color="gray.500">No properties found</Heading>
            <Text color="gray.400">
              Try adjusting your search criteria or filters
            </Text>
          </VStack>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <HStack justify="center" spacing={2}>
            <Button
              size="sm"
              variant="outline"
              isDisabled={searchParams.page === 1}
              onClick={() => handlePageChange(searchParams.page! - 1)}
            >
              Previous
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  size="sm"
                  variant={searchParams.page === page ? 'solid' : 'outline'}
                  colorScheme={searchParams.page === page ? 'primary' : 'gray'}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              )
            })}

            <Button
              size="sm"
              variant="outline"
              isDisabled={searchParams.page === totalPages}
              onClick={() => handlePageChange(searchParams.page! + 1)}
            >
              Next
            </Button>
          </HStack>
        )}
      </VStack>

      {/* Filter Modal */}
      <Modal isOpen={isFilterOpen} onClose={onFilterClose} size="lg">
        <ModalOverlay />
        <ModalContent maxH="90vh" display="flex" flexDirection="column">
          <ModalHeader>Filter Properties</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} overflowY="auto">
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Property Type</FormLabel>
                <Stack spacing={2}>
                  {propertyTypes.map((type) => (
                    <Checkbox 
                      key={type.value} 
                      value={type.value}
                      isChecked={filters.type?.includes(type.value)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? ([...(filters.type || []), type.value] as PropertyType[])
                          : (filters.type || []).filter((t: PropertyType) => t !== type.value);
                        handleFilterChange('type', newTypes.length ? newTypes : undefined);
                      }}
                    >
                      {type.label}
                    </Checkbox>
                  ))}
                </Stack>
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Min Price (PHP)</FormLabel>
                  <NumberInput 
                    min={0}
                    value={filters.priceMin || ''}
                    onChange={(_, value) => handleFilterChange('priceMin', value || undefined)}
                  >
                    <NumberInputField placeholder="0" />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Max Price (PHP)</FormLabel>
                  <NumberInput 
                    min={0}
                    value={filters.priceMax || ''}
                    onChange={(_, value) => handleFilterChange('priceMax', value || undefined)}
                  >
                    <NumberInputField placeholder="No limit" />
                  </NumberInput>
                </FormControl>
              </HStack>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Min Area (sqm)</FormLabel>
                  <NumberInput 
                    min={0}
                    value={filters.minArea || ''}
                    onChange={(_, value) => handleFilterChange('minArea', value || undefined)}
                  >
                    <NumberInputField placeholder="0" />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Max Area (sqm)</FormLabel>
                  <NumberInput 
                    min={0}
                    value={filters.maxArea || ''}
                    onChange={(_, value) => handleFilterChange('maxArea', value || undefined)}
                  >
                    <NumberInputField placeholder="No limit" />
                  </NumberInput>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Location</FormLabel>
                <Input 
                  placeholder="City or Province" 
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Features</FormLabel>
                <SimpleGrid columns={2} spacing={4}>
                  <Checkbox 
                    isChecked={filters.features?.parking}
                    onChange={(e) => handleFeatureToggle('parking', e.target.checked)}
                    size="md"
                  >
                    Parking
                  </Checkbox>
                  <Checkbox 
                    isChecked={filters.features?.furnished}
                    onChange={(e) => handleFeatureToggle('furnished', e.target.checked)}
                    size="md"
                  >
                    Furnished
                  </Checkbox>
                  <Checkbox 
                    isChecked={filters.features?.aircon}
                    onChange={(e) => handleFeatureToggle('aircon', e.target.checked)}
                    size="md"
                  >
                    Air Conditioning
                  </Checkbox>
                  <Checkbox 
                    isChecked={filters.features?.wifi}
                    onChange={(e) => handleFeatureToggle('wifi', e.target.checked)}
                    size="md"
                  >
                    WiFi
                  </Checkbox>
                  <Checkbox 
                    isChecked={filters.features?.security}
                    onChange={(e) => handleFeatureToggle('security', e.target.checked)}
                    size="md"
                    gridColumn="1 / -1"
                  >
                    24/7 Security
                  </Checkbox>
                </SimpleGrid>
              </FormControl>
            </VStack>
          </ModalBody>
          
          <Box p={4} borderTopWidth={1} bg="white" position="sticky" bottom={0} zIndex={1}>
            <HStack spacing={4}>
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                isDisabled={!hasActiveFilters()}
                flex={1}
              >
                Clear Filters
              </Button>
              <Button 
                variant="outline"
                colorScheme="primary"
                onClick={handleFilterApply}
                flex={1}
                border="1px solid"
                borderColor="primary.400"
                _focusVisible={{
                  boxShadow: 'none'
                }}
                _hover={{
                  bg: 'primary.50',
                  transform: 'translateY(-1px)',
                  boxShadow: 'sm',
                  borderColor: 'primary.500'
                }}
                _active={{
                  bg: 'primary.100',
                  transform: 'translateY(0)',
                  borderColor: 'primary.600'
                }}
              >
                Apply Filters
              </Button>
            </HStack>
          </Box>
        </ModalContent>
      </Modal>
    </Container>
  )
}
