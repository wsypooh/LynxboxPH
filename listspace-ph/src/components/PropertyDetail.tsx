'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  HStack,
  VStack,
  Divider,
  Grid,
  SimpleGrid,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { Property, propertyService } from '@/services/propertyService';
import { formatCurrency } from '@/lib/utils';
import { EditIcon, DeleteIcon, ArrowBackIcon, PhoneIcon, EmailIcon } from '@chakra-ui/icons';

interface PropertyDetailProps {
  propertyId: string;
  onBack?: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
}

export function PropertyDetail({ propertyId, onBack, onEdit, onDelete }: PropertyDetailProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const isLoadingRef = useRef(false);

  const fetchProperty = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      const data = await propertyService.getPublicProperty(propertyId);
      setProperty(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch property');
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to fetch property',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [propertyId, toast]);

  useEffect(() => {
    fetchProperty();
  }, [propertyId, fetchProperty]);

  const handleDelete = async () => {
    if (!property) return;

    try {
      setIsDeleting(true);
      await propertyService.deleteProperty(property.id);
      onDelete?.(property);
      onClose();
      
      // Don't show toast here - let the parent component handle it
      // The parent will also handle redirecting back to the manage page
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete property',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePropertyUpdate = (updatedProperty: Property) => {
    setProperty(updatedProperty);
    onEdit?.(updatedProperty);
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading property details...</Text>
        </VStack>
      </Flex>
    );
  }

  if (error || !property) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error || 'Property not found'}
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch" maxW="6xl" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <HStack spacing={4}>
          <Heading size="lg">{property.title}</Heading>
        </HStack>
        
        <HStack spacing={2}>
          {onEdit && (
            <Button
              leftIcon={<EditIcon />}
              colorScheme="blue"
              onClick={() => onEdit(property)}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              leftIcon={<DeleteIcon />}
              colorScheme="red"
              variant="outline"
              onClick={onOpen}
            >
              Delete
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Main Content */}
      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        {/* Left Column - Images and Description */}
        <VStack spacing={6} align="stretch">
          {/* Images */}
          <Card>
            <CardBody p={0}>
              {property.images.length > 0 ? (
                <Box>
                  {/* Main Image */}
                  <Image
                    src={property.images[property.defaultImageIndex ?? 0]}
                    alt={property.title}
                    w="100%"
                    h="400px"
                    objectFit="cover"
                    borderRadius="lg"
                  />
                  
                  {/* Thumbnail Gallery */}
                  {property.images.length > 1 && (
                    <SimpleGrid columns={4} spacing={2} p={4}>
                      {property.images
                        .filter((_, index) => index !== (property.defaultImageIndex ?? 0))
                        .map((image, index) => (
                          <Image
                            key={index}
                            src={image}
                            alt={`${property.title} - Image ${index + 2}`}
                            w="100%"
                          h="80px"
                          objectFit="cover"
                          borderRadius="md"
                          cursor="pointer"
                          onClick={() => {
                            // In a real app, you might want to open a lightbox
                          }}
                        />
                      ))}
                    </SimpleGrid>
                  )}
                </Box>
              ) : (
                <Box
                  h="400px"
                  bg="gray.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="lg"
                >
                  <Text color="gray.500">No images available</Text>
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Description */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Description</Heading>
                <Text whiteSpace="pre-wrap">{property.description}</Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Features */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Features</Heading>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <HStack>
                    <Text>📐</Text>
                    <Text>{property.features.area} m²</Text>
                  </HStack>
                  <HStack>
                    <Text>🚗</Text>
                    <Text>{property.features.parking} parking spaces</Text>
                  </HStack>
                  <HStack>
                    <Text>🏢</Text>
                    <Text>{property.features.floors} floors</Text>
                  </HStack>
                  <HStack>
                    <Text>🪑</Text>
                    <Text>{property.features.furnished ? 'Furnished' : 'Unfurnished'}</Text>
                  </HStack>
                  <HStack>
                    <Text>❄️</Text>
                    <Text>{property.features.aircon ? 'Air Conditioning' : 'No AC'}</Text>
                  </HStack>
                  <HStack>
                    <Text>📶</Text>
                    <Text>{property.features.wifi ? 'WiFi Available' : 'No WiFi'}</Text>
                  </HStack>
                  <HStack>
                    <Text>🔒</Text>
                    <Text>{property.features.security ? 'Security' : 'No Security'}</Text>
                  </HStack>
                </Grid>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Right Column - Details and Contact */}
        <VStack spacing={6} align="stretch">
          {/* Property Details */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Property Details</Heading>
                
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Type</Text>
                    <Badge colorScheme="blue">{property.type}</Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Status</Text>
                    <Badge colorScheme={
                      property.status === 'available' ? 'green' :
                      property.status === 'rented' ? 'blue' :
                      property.status === 'sold' ? 'red' :
                      property.status === 'maintenance' ? 'orange' : 'gray'
                    }>
                      {property.status === 'available' ? 'Available' :
                       property.status === 'rented' ? 'Rented' :
                       property.status === 'sold' ? 'Sold' :
                       property.status === 'maintenance' ? 'Under Maintenance' : property.status}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontWeight="medium">Price</Text>
                    <Text color="blue.600" fontSize="xl" fontWeight="bold">
                      {formatCurrency(property.price, property.currency)}
                    </Text>
                  </HStack>
                  
                  <Divider />
                  
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="medium">Location</Text>
                    <Text>{property.location.address}</Text>
                    <Text>{property.location.city}, {property.location.province}</Text>
                  </VStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Contact Information</Heading>
                
                <VStack spacing={3} align="stretch">
                  <HStack>
                    <Text>👤</Text>
                    <Text>{property.contactInfo.name}</Text>
                  </HStack>
                  
                  <HStack>
                    <PhoneIcon />
                    <Text>{property.contactInfo.phone}</Text>
                  </HStack>
                  
                  <HStack>
                    <EmailIcon />
                    <Text>{property.contactInfo.email}</Text>
                  </HStack>
                </VStack>
                
                <Button colorScheme="blue" w="full">
                  Contact Owner
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Additional Information</Heading>
                
                <VStack spacing={2} align="stretch" fontSize="sm" color="gray.600">
                  <HStack justify="space-between">
                    <Text>Property ID</Text>
                    <Text>{property.id}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text>Listed Date</Text>
                    <Text>{new Date(property.createdAt).toLocaleDateString()}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text>Last Updated</Text>
                    <Text>{new Date(property.updatedAt).toLocaleDateString()}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text>Views</Text>
                    <Text>{property.viewCount || 0}</Text>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Grid>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Property</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="warning">
                <AlertIcon />
                This action cannot be undone
              </Alert>
              <Text>
                Are you sure you want to delete &quot;{property.title}&quot;? This will permanently remove the property and all associated images.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Property
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
