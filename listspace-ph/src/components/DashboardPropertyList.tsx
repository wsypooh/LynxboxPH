'use client';

import {
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
  useToast,
} from '@chakra-ui/react'
import { Search, Filter, Building2, X, Plus } from 'lucide-react'
import { EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons'
import { useState, useEffect, useCallback } from 'react'
import { Property, propertyService, PropertyType } from '@/services/propertyService'
import { formatCurrency } from '@/lib/utils';
import { PropertyStatusUpdater } from './PropertyStatusUpdater';

interface FilterState {
  type?: PropertyType[];
  status?: string[];
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

interface DashboardPropertyListProps {
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onAddNew?: () => void;
  refreshTrigger?: number;
}

export function DashboardPropertyList({
  onView,
  onEdit,
  onDelete,
  onAddNew,
  refreshTrigger = 0,
}: DashboardPropertyListProps) {
  const STORAGE_KEY = 'dashboard-properties-filters';
  
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
  const toast = useToast();

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
    const hasStatusFilter = Boolean(currentFilters.status?.length);
    const hasPriceFilters = currentFilters.priceMin !== undefined || currentFilters.priceMax !== undefined;
    const hasAreaFilters = currentFilters.minArea !== undefined || currentFilters.maxArea !== undefined;
    const hasLocationFilter = Boolean(currentFilters.location);
    const hasFeatureFilters = currentFilters.features ? 
      Object.values(currentFilters.features).some((value): value is boolean => value === true) : 
      false;
    
    return hasTypeFilter || hasStatusFilter || hasPriceFilters || hasAreaFilters || hasLocationFilter || hasFeatureFilters;
  }, [searchParams.filters]);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Use the real API service for user properties
      let result;
      if (searchParams.query) {
        // If there's a search query, use search endpoint for user properties
        result = await propertyService.searchUserProperties(
          searchParams.query, 
          searchParams.limit
        );
        console.log('User search result:', result);
        
        // Apply additional filters on client side
        let items = result?.items || [];
        
        // Apply filters if they exist
        if (searchParams.filters && hasActiveFilters()) {
          const filters = searchParams.filters;
          
          // Filter by type
          if (filters.type && filters.type.length > 0) {
            items = items.filter(p => filters.type!.includes(p.type));
          }
          
          // Filter by status
          if (filters.status && filters.status.length > 0) {
            items = items.filter(p => filters.status!.includes(p.status));
          }
          
          // Filter by price range
          if (filters.priceMin !== undefined) {
            items = items.filter(p => p.price >= filters.priceMin!);
          }
          if (filters.priceMax !== undefined) {
            items = items.filter(p => p.price <= filters.priceMax!);
          }
          
          // Filter by area range
          if (filters.minArea !== undefined) {
            items = items.filter(p => p.features.area >= filters.minArea!);
          }
          if (filters.maxArea !== undefined) {
            items = items.filter(p => p.features.area <= filters.maxArea!);
          }
          
          // Filter by location
          if (filters.location) {
            items = items.filter(p => 
              p.location.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
              p.location.address.toLowerCase().includes(filters.location!.toLowerCase())
            );
          }
          
          // Filter by features
          if (filters.features) {
            if (filters.features.parking) {
              items = items.filter(p => p.features.parking > 0);
            }
            if (filters.features.furnished) {
              items = items.filter(p => p.features.furnished);
            }
            if (filters.features.aircon) {
              items = items.filter(p => p.features.aircon);
            }
            if (filters.features.wifi) {
              items = items.filter(p => p.features.wifi);
            }
            if (filters.features.security) {
              items = items.filter(p => p.features.security);
            }
          }
        }
        
        // Apply sorting
        items.sort((a, b) => {
          let aValue: number | string;
          let bValue: number | string;
          
          switch (searchParams.sortBy) {
            case 'price':
              aValue = a.price;
              bValue = b.price;
              break;
            case 'area':
              aValue = a.features.area;
              bValue = b.features.area;
              break;
            case 'views':
              aValue = a.viewCount || 0;
              bValue = b.viewCount || 0;
              break;
            case 'date':
            default:
              aValue = new Date(a.createdAt).getTime();
              bValue = new Date(b.createdAt).getTime();
              break;
          }
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return searchParams.sortOrder === 'asc' 
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }
          
          return searchParams.sortOrder === 'asc' 
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
        });
        
        setProperties(items);
        setTotal(items.length);
        setTotalPages(Math.ceil(items.length / (searchParams.limit || 12)));
      } else {
        // Otherwise, list user's properties with basic filters
        const listParams: any = {
          limit: searchParams.limit,
          sortBy: searchParams.sortBy,
          sortOrder: searchParams.sortOrder
        };
        
        // Add type filter if specified
        if (searchParams.filters?.type && searchParams.filters.type.length === 1) {
          listParams.type = searchParams.filters.type[0];
        }
        
        const listResult = await propertyService.listProperties(listParams);
        console.log('User list result:', listResult);
        
        let items = listResult?.items || [];
        
        // Apply additional filters if they exist
        if (searchParams.filters && hasActiveFilters()) {
          const filters = searchParams.filters;
          
          // Filter by status
          if (filters.status && filters.status.length > 0) {
            items = items.filter(p => filters.status!.includes(p.status));
          }
          
          // Filter by price range
          if (filters.priceMin !== undefined) {
            items = items.filter(p => p.price >= filters.priceMin!);
          }
          if (filters.priceMax !== undefined) {
            items = items.filter(p => p.price <= filters.priceMax!);
          }
          
          // Filter by area range
          if (filters.minArea !== undefined) {
            items = items.filter(p => p.features.area >= filters.minArea!);
          }
          if (filters.maxArea !== undefined) {
            items = items.filter(p => p.features.area <= filters.maxArea!);
          }
          
          // Filter by location
          if (filters.location) {
            items = items.filter(p => 
              p.location.city.toLowerCase().includes(filters.location!.toLowerCase()) ||
              p.location.address.toLowerCase().includes(filters.location!.toLowerCase())
            );
          }
          
          // Filter by features
          if (filters.features) {
            if (filters.features.parking) {
              items = items.filter(p => p.features.parking > 0);
            }
            if (filters.features.furnished) {
              items = items.filter(p => p.features.furnished);
            }
            if (filters.features.aircon) {
              items = items.filter(p => p.features.aircon);
            }
            if (filters.features.wifi) {
              items = items.filter(p => p.features.wifi);
            }
            if (filters.features.security) {
              items = items.filter(p => p.features.security);
            }
          }
        }
        
        setProperties(items);
        setTotal(items.length);
        setTotalPages(Math.ceil(items.length / (searchParams.limit || 12)));
      }
    } catch (err: any) {
      console.error('Error loading properties:', err);
      setError(err.message || 'Failed to load properties')
      setProperties([]);
    } finally {
      setLoading(false)
    }
  }, [searchParams, hasActiveFilters]);

  useEffect(() => {
    loadProperties()
  }, [loadProperties, refreshTrigger]);

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

  const handleDelete = async (property: Property) => {
    if (!onDelete) return;

    try {
      await propertyService.deleteProperty(property.id);
      onDelete(property);
      setProperties(prev => prev.filter(p => p.id !== property.id));
      
      toast({
        title: 'Property deleted',
        description: 'Property has been deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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

  const handleStatusUpdate = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
  };

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'office', label: 'Office' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'land', label: 'Land' },
  ]
  
  const propertyStatuses = [
    { value: 'available', label: 'Available' },
    { value: 'rented', label: 'Rented' },
    { value: 'sold', label: 'Sold' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  return (
    <VStack spacing={6} align="stretch">
      {/* Header with Add Button */}
      <HStack justify="space-between" align="center">
        <Heading size="lg">My Properties ({total})</Heading>
        {onAddNew && (
          <Button
            leftIcon={<Plus />}
            colorScheme="blue"
            onClick={onAddNew}
          >
            Add Property
          </Button>
        )}
      </HStack>

      {/* Search and Filters */}
      <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
        <VStack spacing={4}>
          <HStack w="full" spacing={4}>
            <InputGroup flex={1}>
              <InputLeftElement>
                <Icon as={Search} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search your properties by title, location, or description..."
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
                  leftIcon={<X />}
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
                <Badge colorScheme="blue" variant="solid">
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
          <Spinner size="lg" color="blue.500" />
        </Flex>
      )}

      {/* Properties Grid */}
      {!loading && properties && properties.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {properties.map((property) => (
            <Box
              key={property.id}
              bg="white"
              borderRadius="lg"
              overflow="hidden"
              boxShadow="md"
              border="1px solid"
              borderColor="gray.200"
            >
              {/* Property Image */}
              <Box position="relative" h="200px">
                {property.images.length > 0 ? (
                  <Box
                    h="200px"
                    w="100%"
                    bgImage={`url(${property.images[property.defaultImageIndex ?? 0]})`}
                    bgSize="cover"
                    bgPosition="center"
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

              {/* Property Details */}
              <Box p={4}>
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
                    {property.viewCount !== undefined && (
                      <Text>👁️ {property.viewCount.toLocaleString()} views</Text>
                    )}
                  </HStack>

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

                  {/* Action Buttons */}
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
                      onClick={() => onEdit?.(property)}
                      flex={1}
                    >
                      Edit
                    </Button>
                    <Button
                      leftIcon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => handleDelete(property)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Empty State */}
      {!loading && (!properties || properties.length === 0) && !error && (
        <VStack spacing={4} py={12} textAlign="center">
          <Icon as={Building2} boxSize={16} color="gray.300" />
          <Heading size="md" color="gray.500">No properties found</Heading>
          <Text color="gray.400">
            {hasActiveFilters() ? 'Try adjusting your search criteria or filters' : 'Get started by adding your first property'}
          </Text>
          {!hasActiveFilters() && onAddNew && (
            <Button
              leftIcon={<Plus />}
              colorScheme="blue"
              onClick={onAddNew}
            >
              Add Property
            </Button>
          )}
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
                colorScheme={searchParams.page === page ? 'blue' : 'gray'}
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

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Stack spacing={2}>
                  {propertyStatuses.map((status) => (
                    <Checkbox 
                      key={status.value} 
                      value={status.value}
                      isChecked={filters.status?.includes(status.value)}
                      onChange={(e) => {
                        const newStatuses = e.target.checked
                          ? ([...(filters.status || []), status.value])
                          : (filters.status || []).filter((s: string) => s !== status.value);
                        handleFilterChange('status', newStatuses.length ? newStatuses : undefined);
                      }}
                    >
                      {status.label}
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
                colorScheme="blue"
                onClick={handleFilterApply}
                flex={1}
              >
                Apply Filters
              </Button>
            </HStack>
          </Box>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
