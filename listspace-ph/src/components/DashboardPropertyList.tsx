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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Switch,
  Divider,
} from '@chakra-ui/react'
import { Search, Filter, Building2, X, Plus, Grid, List, ChevronUp, ChevronDown } from 'lucide-react'
import { EditIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons'
import { useState, useEffect, useCallback, useRef } from 'react'
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
  limit?: number;
  sortBy?: 'price' | 'area' | 'date' | 'views' | 'status';
  sortOrder?: 'asc' | 'desc';
  filters?: FilterState;
}

interface TableSortState {
  sortBy: 'price' | 'area' | 'date' | 'views' | 'status';
  sortOrder: 'asc' | 'desc';
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
      limit: 12,
      sortBy: 'date',
      sortOrder: 'desc'
    };
  };
  
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useState<PropertySearchParams>(initializeSearchParams)
  const [tableSort, setTableSort] = useState<TableSortState>({ sortBy: 'date', sortOrder: 'desc' })
  const [hasMore, setHasMore] = useState(false)
  const [lastKey, setLastKey] = useState<string | undefined>()
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const lastKeyRef = useRef<string | undefined>() // Use ref to avoid infinite loop
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

  // Apply table sorting when switching to table view or changing table sort
  useEffect(() => {
    if (viewMode === 'table' && properties.length > 0) {
      const sortedProperties = [...properties].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        
        switch (tableSort.sortBy) {
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
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'date':
          default:
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return tableSort.sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return tableSort.sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
      
      setProperties(sortedProperties);
    }
  }, [tableSort]);

  // Apply table sorting when switching to table view
  useEffect(() => {
    if (viewMode === 'table' && properties.length > 0) {
      const sortedProperties = [...properties].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        
        switch (tableSort.sortBy) {
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
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'date':
          default:
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return tableSort.sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return tableSort.sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
      
      setProperties(sortedProperties);
    }
  }, [viewMode]);

  // Sync ref with state
  useEffect(() => {
    lastKeyRef.current = lastKey
  }, [lastKey])

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

  const loadProperties = useCallback(async (resetPagination = false, isSorting = false) => {
    try {
      setLoading(true)
      setError('')
      
      // If we're just sorting existing properties, don't make API calls
      if (isSorting && properties.length > 0 && !resetPagination) {
        // Sort the existing properties
        const sortedProperties = [...properties].sort((a, b) => {
          let aValue: string | number;
          let bValue: string | number;
          
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
            case 'status':
              aValue = a.status;
              bValue = b.status;
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
        
        setProperties(sortedProperties);
        setLoading(false);
        return;
      }
      
      // Use the real API service for user properties
      let result;
      if (searchParams.query) {
        // If there's a search query, use search endpoint for user properties
        result = await propertyService.searchUserProperties(
          searchParams.query, 
          searchParams.limit
        );
        console.log('User search result:', result);
        
        // Search API doesn't support pagination yet, so replace all properties
        let items = result?.items || [];
        
        // Apply additional filters on client side
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
          let aValue: string | number;
          let bValue: string | number;
          
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
            case 'status':
              aValue = a.status;
              bValue = b.status;
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
        setTotalCount(items.length);
        setHasMore(false);
        setLastKey(undefined);
      } else {
        // Otherwise, list user's properties with pagination
        const listParams: any = {
          limit: searchParams.limit,
          sortBy: searchParams.sortBy,
          sortOrder: searchParams.sortOrder
        };
        
        // Add pagination cursor
        const currentLastKey = resetPagination ? undefined : lastKeyRef.current;
        if (currentLastKey) {
          listParams.lastKey = currentLastKey;
        }
        
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
        
        // Apply client-side sorting for consistency across all fields
        items.sort((a, b) => {
          let aValue: string | number;
          let bValue: string | number;
          
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
            case 'status':
              aValue = a.status;
              bValue = b.status;
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
        
        // Handle pagination - append or replace based on resetPagination flag
        if (resetPagination) {
          setProperties(items);
        } else {
          setProperties(prev => [...prev, ...items]);
        }
        
        // Update pagination state
        setHasMore(!!listResult?.lastKey);
        setLastKey(listResult?.lastKey);
        
        // Update total count (approximate)
        if (resetPagination) {
          setTotalCount(items.length);
        } else {
          setTotalCount(prev => prev + items.length);
        }
      }
    } catch (err: any) {
      console.error('Error loading properties:', err);
      setError(err.message || 'Failed to load properties')
      setProperties([]);
    } finally {
      setLoading(false)
    }
  }, [searchParams, hasActiveFilters, properties]) // Added properties dependency for sorting

  // Create a separate effect to handle initial load and search/filter changes
  useEffect(() => {
    loadProperties(true) // Always reset pagination for new searches/filters
  }, [searchParams.query, searchParams.filters, hasActiveFilters])

  // Handle sort by dropdown changes
  useEffect(() => {
    loadProperties(true) // Reset pagination when sort changes
  }, [searchParams.sortBy, searchParams.sortOrder]);

  useEffect(() => {
    loadProperties(true) // Reset when refreshTrigger changes
  }, [refreshTrigger]);

  const handleSearch = (query: string) => {
    setSearchParams(prev => ({
      ...prev,
      query: query || undefined
    }))
    // Reset pagination when searching
    setLastKey(undefined)
    setHasMore(false)
  }

  const handleSortChange = (sortBy: string) => {
    const [field, order] = sortBy.split('-')
    setSearchParams(prev => ({
      ...prev,
      sortBy: field as any,
      sortOrder: order as 'asc' | 'desc'
    }))
    // Reset pagination when sorting
    setLastKey(undefined)
    setHasMore(false)
  }

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadProperties(false) // Load next page without resetting
    }
  }

  const handleTableSort = (field: 'price' | 'area' | 'date' | 'views' | 'status') => {
    const newSortOrder = tableSort.sortBy === field && tableSort.sortOrder === 'asc' ? 'desc' : 'asc'
    
    // Update table sort state only
    setTableSort({
      sortBy: field,
      sortOrder: newSortOrder
    })
    
    // Sort existing properties immediately using table sort
    const sortedProperties = [...properties].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (field) {
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
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'date':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return newSortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return newSortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    
    setProperties(sortedProperties);
  }

  const getSortIcon = (field: 'price' | 'area' | 'date' | 'views' | 'status') => {
    if (tableSort.sortBy !== field) return null
    return tableSort.sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
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
    }));
    onFilterClose();
    // Reset pagination when applying filters
    setLastKey(undefined)
    setHasMore(false)
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {};
    setFilters(clearedFilters);
    setSearchParams(prev => ({
      ...prev,
      filters: clearedFilters,
    }));
    // Reset pagination when clearing filters
    setLastKey(undefined)
    setHasMore(false)
  };
  
  const clearAllFilters = () => {
    setSearchParams({
      limit: 12,
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setFilters({});
    // Reset pagination when clearing all filters
    setLastKey(undefined)
    setHasMore(false)
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
      {/* Header with Add Button and View Toggle */}
      <HStack justify="space-between" align="center">
        <Heading size="lg">My Properties ({totalCount})</Heading>
        <HStack spacing={4}>
          {/* View Mode Toggle */}
          <HStack spacing={2} bg="gray.100" p={1} borderRadius="md">
            <IconButton
              aria-label="Card view"
              icon={<Grid size={16} />}
              size="sm"
              variant={viewMode === 'cards' ? 'solid' : 'ghost'}
              colorScheme={viewMode === 'cards' ? 'blue' : 'gray'}
              onClick={() => setViewMode('cards')}
            />
            <IconButton
              aria-label="Table view"
              icon={<List size={16} />}
              size="sm"
              variant={viewMode === 'table' ? 'solid' : 'ghost'}
              colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
              onClick={() => setViewMode('table')}
            />
          </HStack>
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
          {loading ? 'Loading...' : `Showing ${properties?.length || 0} properties`}
        </Text>
        <Spacer />
        {hasMore && (
          <Text fontSize="sm" color="gray.500">
            Load more available
          </Text>
        )}
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

      {/* Properties Display */}
      {!loading && properties && properties.length > 0 && (
        <>
          {viewMode === 'cards' ? (
            /* Card View */
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
          ) : (
            /* Table View */
            <Box overflowX="auto">
              <TableContainer bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200" minW="800px">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th minW="220px" maxW="220px">
                        <Button
                          variant="unstyled"
                          size="sm"
                          onClick={() => handleTableSort('date')}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          fontWeight="bold"
                        >
                          Property
                          {getSortIcon('date')}
                        </Button>
                      </Th>
                      <Th minW="90px">
                        <Button
                          variant="unstyled"
                          size="sm"
                          onClick={() => handleTableSort('price')}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          fontWeight="bold"
                        >
                          Price
                          {getSortIcon('price')}
                        </Button>
                      </Th>
                      <Th minW="150px">Location</Th>
                      <Th minW="80px">
                        <Button
                          variant="unstyled"
                          size="sm"
                          onClick={() => handleTableSort('status')}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          fontWeight="bold"
                        >
                          Status
                          {getSortIcon('status')}
                        </Button>
                      </Th>
                      <Th minW="60px">
                        <Button
                          variant="unstyled"
                          size="sm"
                          onClick={() => handleTableSort('area')}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          fontWeight="bold"
                        >
                          Area
                          {getSortIcon('area')}
                        </Button>
                      </Th>
                      <Th minW="60px">
                        <Button
                          variant="unstyled"
                          size="sm"
                          onClick={() => handleTableSort('views')}
                          display="flex"
                          alignItems="center"
                          gap={1}
                          fontWeight="bold"
                        >
                          Views
                          {getSortIcon('views')}
                        </Button>
                      </Th>
                      <Th minW="80px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {properties.map((property) => (
                      <Tr key={property.id}>
                        <Td>
                          <VStack align="start" spacing={2} maxW="220px">
                            <HStack spacing={2} align="start">
                              <Text fontWeight="medium" fontSize="sm" noOfLines={1} flex={1}>
                                {property.title}
                              </Text>
                              <Badge colorScheme="blue" variant="outline" fontSize="xs" flexShrink={0}>
                                {property.type}
                              </Badge>
                            </HStack>
                            <Text fontSize="xs" color="gray.600" noOfLines={2} wordBreak="break-word">
                              {property.description}
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <Text fontWeight="bold" color="blue.600" fontSize="xs" whiteSpace="nowrap">
                            {formatCurrency(property.price, property.currency)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="xs" noOfLines={2} maxW="150px">
                            {property.location.address}, {property.location.city}
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={property.status === 'available' ? 'green' : 'orange'}
                            fontSize="xs"
                          >
                            {property.status}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="xs">
                            {property.features.area}m²
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="xs">
                            {property.viewCount?.toLocaleString() || 0}
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing={1} minW="80px">
                            <IconButton
                              aria-label="View property"
                              icon={<ViewIcon />}
                              size="xs"
                              variant="outline"
                              onClick={() => onView?.(property)}
                              fontSize="xs"
                            />
                            <IconButton
                              aria-label="Edit property"
                              icon={<EditIcon />}
                              size="xs"
                              colorScheme="blue"
                              onClick={() => onEdit?.(property)}
                              fontSize="xs"
                            />
                            <IconButton
                              aria-label="Delete property"
                              icon={<DeleteIcon />}
                              size="xs"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleDelete(property)}
                              fontSize="xs"
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
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

      {/* Load More Button */}
      {!loading && hasMore && (
        <Flex justify="center" py={8}>
          <Button
            onClick={handleLoadMore}
            isLoading={loading}
            loadingText="Loading more..."
            variant="outline"
            colorScheme="blue"
            size="lg"
            px={8}
          >
            Load More Properties
          </Button>
        </Flex>
      )}

      {/* End of Results */}
      {!loading && !hasMore && properties.length > 0 && (
        <Flex justify="center" py={4}>
          <Text color="gray.500" fontSize="sm">
            You&apos;ve reached the end of your properties
          </Text>
        </Flex>
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
