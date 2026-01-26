'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberDecrementStepper,
  NumberIncrementStepper,
  Checkbox,
  Radio,
  RadioGroup,
  Stack,
  VStack,
  HStack,
  Heading,
  Divider,
  Text,
  Alert,
  AlertIcon,
  useToast,
  Progress,
  Image,
  IconButton,
  Flex,
  Grid,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PropertyInput, PropertyType, PropertyStatus, Property, propertyService } from '@/services/propertyService';
import { validateImageFile, convertFileToBase64, extractBase64Data } from '@/lib/utils';
import { CloseIcon, AddIcon } from '@chakra-ui/icons';
import { useAuth } from '@/features/auth/AuthContext';
import { getCurrentUserId } from '@/lib/auth';
import { SecureImage } from '@/components/SecureImage';

// Import API_BASE_URL for environment detection
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rw11kscwd5.execute-api.ap-southeast-1.amazonaws.com/dev';

const propertySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  type: z.enum(['office', 'commercial', 'land'] as const),
  price: z.number().min(0, 'Price must be a positive number'),
  currency: z.string().default('PHP'),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    province: z.string().min(1, 'Province is required'),
    coordinates: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
  }),
  features: z.object({
    area: z.number().min(0, 'Area must be a positive number'),
    parking: z.number().min(0, 'Parking must be a positive number'),
    floors: z.number().min(0, 'Floors must be a positive number'),
    furnished: z.boolean(),
    aircon: z.boolean(),
    wifi: z.boolean(),
    security: z.boolean(),
  }),
  status: z.enum(['available', 'rented', 'sold', 'maintenance'] as const).default('available'),
  contactInfo: z.object({
    name: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
  }),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  onSuccess?: (property: Property) => void;
  onCancel?: () => void;
  initialData?: Partial<Property>;
  isEditing?: boolean;
  propertyId?: string;
}

export function PropertyForm({
  onSuccess,
  onCancel,
  initialData,
  isEditing = false,
  propertyId,
}: PropertyFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [defaultImageIndex, setDefaultImageIndex] = useState<number | undefined>(0);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'office',
      price: 0,
      currency: 'PHP',
      location: {
        address: '',
        city: '',
        province: '',
      },
      features: {
        area: 0,
        parking: 0,
        floors: 1,
        furnished: false,
        aircon: false,
        wifi: false,
        security: false,
      },
      status: 'available',
      contactInfo: {
        name: '',
        email: '',
        phone: '',
      },
      ...initialData,
    },
  });

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const validFiles = files.filter(file => {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        toast({
          title: 'Invalid file',
          description: validation.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setSelectedImages(prev => [...prev, ...validFiles]);

    // Create previews for all valid files
    validFiles.forEach(file => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && result.startsWith('data:image/')) {
          setImagePreviews(prev => {
            const newPreviews = [...prev, result];
            // If this is the first image and no default is set, set it as default
            if (newPreviews.length === 1 && defaultImageIndex === undefined) {
              setDefaultImageIndex(0);
            }
            return newPreviews;
          });
        } else {
          console.error('Invalid image data URL generated:', result);
          toast({
            title: 'Image Processing Error',
            description: 'Failed to process image file',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      };

      reader.onerror = () => {
        console.error('FileReader error for file:', file.name);
        toast({
          title: 'Image Reading Error',
          description: `Failed to read image file: ${file.name}`,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      };

      reader.readAsDataURL(file);
    });
  }, [toast, defaultImageIndex]);

  const removeImage = useCallback((index: number) => {
    const removedImage = imagePreviews[index];
    
    // For new images, remove from both selectedImages and imagePreviews
    if (index < selectedImages.length) {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // For existing images, add to removedImages list and remove from previews
      if (removedImage) {
        setRemovedImages(prev => {
          const updated = [...prev, removedImage];
          return updated;
        });
      }
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }

    // Adjust defaultImageIndex if necessary
    if (defaultImageIndex === index) {
      // If deleting the default image, set to 0 if images remain, undefined if none
      setDefaultImageIndex(imagePreviews.length > 1 ? 0 : undefined);
    } else if (defaultImageIndex !== undefined && defaultImageIndex > index) {
      // If deleting an image before the default, shift the default index down
      setDefaultImageIndex(prev => prev !== undefined ? prev - 1 : undefined);
    }
  }, [selectedImages, imagePreviews, defaultImageIndex]);

  const handleDefaultImageSelect = useCallback((index: number) => {
    setDefaultImageIndex(index);
  }, []);

  // Load existing images when editing
  useEffect(() => {
    if (isEditing && initialData?.images) {
      setImagePreviews(initialData.images);
      setDefaultImageIndex(initialData.defaultImageIndex ?? 0);
    }
  }, [isEditing, initialData]);


  const onSubmit = async (data: PropertyFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress(0);

      // Convert images to base64
      const base64Images = await Promise.all(
        selectedImages.map(async (file) => {
          const dataUrl = await convertFileToBase64(file);
          const base64Data = {
            data: extractBase64Data(dataUrl),
            fileName: file.name,
            contentType: file.type,
          };
          return base64Data;
        })
      );

      // Handle coordinates - only include if both lat and lng are present
      const coordinates = data.location.coordinates;
      const locationWithCoordinates = {
        ...data.location,
        coordinates: (coordinates?.lat !== undefined && coordinates?.lng !== undefined) 
          ? { lat: coordinates.lat, lng: coordinates.lng }
          : undefined
      };

      // Get user ID from JWT for new properties
      let userId = null;
      if (!isEditing) {
        try {
          userId = await getCurrentUserId();
        } catch (error) {
          console.error('Error getting user ID from JWT:', error);
          toast({
            title: 'Authentication Error',
            description: 'Unable to get user information. Please log in again.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }

      const propertyData: PropertyInput = {
        ...data,
        location: locationWithCoordinates,
        base64Images, // Include images for both local and production APIs
        defaultImageIndex: imagePreviews.length > 0 ? defaultImageIndex : undefined,
        ...(removedImages.length > 0 && { removeImages: removedImages }), // Include removed images if any
        // Add owner ID when creating a new property
        ...(!isEditing && userId && { ownerId: userId }),
      };


      let result;
      if (isEditing && propertyId) {
        result = await propertyService.updateProperty(propertyId, propertyData);
        
        if (!result) {
          throw new Error('Update failed: No data returned from server');
        }
        
        toast({
          title: 'Property updated',
          description: 'Property has been updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        result = await propertyService.createProperty(propertyData);
        
        if (!result) {
          throw new Error('Create failed: No data returned from server');
        }
      }

      onSuccess?.(result);

      // Reset form state after successful submission
      setSelectedImages([]);
      setRemovedImages([]);
      setImagePreviews([]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save property';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={6} align="stretch">
            {/* Basic Information */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Basic Information</Heading>
                  
                  <FormControl isInvalid={!!errors.title}>
                    <FormLabel>Title</FormLabel>
                    <Input {...register('title')} placeholder="Enter property title" />
                    <Text color="red.500" fontSize="sm">
                      {errors.title?.message}
                    </Text>
                  </FormControl>

                  <FormControl isInvalid={!!errors.description}>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                      {...register('description')}
                      placeholder="Describe your property"
                      rows={4}
                    />
                    <Text color="red.500" fontSize="sm">
                      {errors.description?.message}
                    </Text>
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl isInvalid={!!errors.type}>
                      <FormLabel>Property Type</FormLabel>
                      <Select {...register('type')}>
                        <option value="office">Office</option>
                        <option value="commercial">Commercial</option>
                        <option value="land">Land</option>
                      </Select>
                      <Text color="red.500" fontSize="sm">
                        {errors.type?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.status}>
                      <FormLabel>Property Status</FormLabel>
                      <Select {...register('status')}>
                        <option value="available">Available</option>
                        <option value="rented">Rented</option>
                        <option value="sold">Sold</option>
                        <option value="maintenance">Under Maintenance</option>
                      </Select>
                      <Text color="red.500" fontSize="sm">
                        {errors.status?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.price}>
                      <FormLabel>Price</FormLabel>
                      <Controller
                        control={control}
                        name="price"
                        render={({ field }) => (
                          <NumberInput
                            {...field}
                            onChange={(value) => field.onChange(parseFloat(value) || 0)}
                            min={0}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                      <Text color="red.500" fontSize="sm">
                        {errors.price?.message}
                      </Text>
                    </FormControl>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Location */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Location</Heading>
                  
                  <FormControl isInvalid={!!errors.location?.address}>
                    <FormLabel>Address</FormLabel>
                    <Input {...register('location.address')} placeholder="Street address" />
                    <Text color="red.500" fontSize="sm">
                      {errors.location?.address?.message}
                    </Text>
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl isInvalid={!!errors.location?.city}>
                      <FormLabel>City</FormLabel>
                      <Input {...register('location.city')} placeholder="City" />
                      <Text color="red.500" fontSize="sm">
                        {errors.location?.city?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.location?.province}>
                      <FormLabel>Province</FormLabel>
                      <Input {...register('location.province')} placeholder="Province" />
                      <Text color="red.500" fontSize="sm">
                        {errors.location?.province?.message}
                      </Text>
                    </FormControl>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Features */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Features</Heading>
                  
                  <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                    <FormControl isInvalid={!!errors.features?.area}>
                      <FormLabel>Area (m²)</FormLabel>
                      <Controller
                        control={control}
                        name="features.area"
                        render={({ field }) => (
                          <NumberInput
                            {...field}
                            onChange={(value) => field.onChange(parseFloat(value) || 0)}
                            min={0}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                      <Text color="red.500" fontSize="sm">
                        {errors.features?.area?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.features?.parking}>
                      <FormLabel>Parking Spaces</FormLabel>
                      <Controller
                        control={control}
                        name="features.parking"
                        render={({ field }) => (
                          <NumberInput
                            {...field}
                            onChange={(value) => field.onChange(parseFloat(value) || 0)}
                            min={0}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                      <Text color="red.500" fontSize="sm">
                        {errors.features?.parking?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.features?.floors}>
                      <FormLabel>Floors</FormLabel>
                      <Controller
                        control={control}
                        name="features.floors"
                        render={({ field }) => (
                          <NumberInput
                            {...field}
                            onChange={(value) => field.onChange(parseFloat(value) || 0)}
                            min={0}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                      <Text color="red.500" fontSize="sm">
                        {errors.features?.floors?.message}
                      </Text>
                    </FormControl>
                  </Grid>

                  <Stack spacing={4} direction="row">
                    <Checkbox {...register('features.furnished')}>Furnished</Checkbox>
                    <Checkbox {...register('features.aircon')}>Air Conditioning</Checkbox>
                    <Checkbox {...register('features.wifi')}>WiFi</Checkbox>
                    <Checkbox {...register('features.security')}>Security</Checkbox>
                  </Stack>
                </VStack>
              </CardBody>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Contact Information</Heading>
                  
                  <HStack spacing={4}>
                    <FormControl isInvalid={!!errors.contactInfo?.name}>
                      <FormLabel>Contact Name</FormLabel>
                      <Input {...register('contactInfo.name')} placeholder="Contact person name" />
                      <Text color="red.500" fontSize="sm">
                        {errors.contactInfo?.name?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.contactInfo?.email}>
                      <FormLabel>Email</FormLabel>
                      <Input {...register('contactInfo.email')} type="email" placeholder="contact@example.com" />
                      <Text color="red.500" fontSize="sm">
                        {errors.contactInfo?.email?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.contactInfo?.phone}>
                      <FormLabel>Phone</FormLabel>
                      <Input {...register('contactInfo.phone')} placeholder="+63 XXX XXX XXXX" />
                      <Text color="red.500" fontSize="sm">
                        {errors.contactInfo?.phone?.message}
                      </Text>
                    </FormControl>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Images */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Property Images</Heading>
                  
                  <FormControl>
                    <FormLabel>Upload Images</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      display="none"
                      id="image-upload"
                    />
                    <Button
                      as="label"
                      htmlFor="image-upload"
                      leftIcon={<AddIcon />}
                      variant="outline"
                      cursor="pointer"
                    >
                      Add Images
                    </Button>
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Upload up to 10 images. Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB per image.
                    </Text>
                  </FormControl>

                  {imagePreviews.length > 0 && (
                    <Box>
                      <FormControl mb={4}>
                        <FormLabel fontSize="sm" fontWeight="medium">
                          Select Default Image
                        </FormLabel>
                        <Text fontSize="xs" color="gray.600" mb={2}>
                          Choose which image will be shown as the primary image for your property.
                        </Text>
                      </FormControl>
                      <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
                        {imagePreviews.map((preview, index) => {
                          // Check if this is a new image (data URL) or existing image (S3 key)
                          const isNewImage = preview.startsWith('data:image/');
                          const isExistingImage = !isNewImage && preview.includes('/');
                          
                          return (
                            <Box key={index} position="relative">
                              <Box
                                position="relative"
                                borderWidth={defaultImageIndex === index ? "3px" : "1px"}
                                borderColor={defaultImageIndex === index ? "blue.500" : "gray.200"}
                                borderRadius="md"
                                overflow="hidden"
                                cursor="pointer"
                                onClick={() => handleDefaultImageSelect(index)}
                              >
                                {isExistingImage && propertyId ? (
                                  <SecureImage
                                    propertyId={propertyId}
                                    imageKey={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-[150px] h-[150px] object-cover"
                                    fallbackClassName="w-[150px] h-[150px] bg-gray-100"
                                    onError={(error) => {
                                      console.error(`SecureImage error for index ${index}:`, error);
                                    }}
                                  />
                                ) : (
                                  <Box
                                    as="img"
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    w="150px"
                                    h="150px"
                                    objectFit="cover"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                      console.error(`Image preview error for index ${index}:`, preview);
                                      console.error('Error event:', e);
                                    }}
                                    onLoad={() => {
                                      // Image loaded successfully
                                    }}
                                  />
                                )}
                                {defaultImageIndex === index && (
                                  <Box
                                    position="absolute"
                                    top={1}
                                    left={1}
                                    bg="blue.500"
                                    color="white"
                                    borderRadius="full"
                                    p={1}
                                  >
                                    <Box w={3} h={3} borderRadius="full" bg="white" />
                                  </Box>
                                )}
                                <Box
                                  position="absolute"
                                  bottom={0}
                                  left={0}
                                  right={0}
                                  bg="rgba(0,0,0,0.6)"
                                  color="white"
                                  p={1}
                                  textAlign="center"
                                  fontSize="xs"
                                >
                                  {defaultImageIndex === index ? "Default" : "Set as default"}
                                </Box>
                              </Box>
                              <IconButton
                                icon={<CloseIcon />}
                                size="sm"
                                position="absolute"
                                top={-2}
                                right={-2}
                                colorScheme="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(index);
                                }}
                                aria-label="Remove image"
                              />
                            </Box>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}

                  {uploadProgress > 0 && (
                    <Box>
                      <Text mb={2}>Uploading images... {uploadProgress.toFixed(0)}%</Text>
                      <Progress value={uploadProgress} colorScheme="blue" />
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Submit Buttons */}
            <HStack spacing={4} justify="flex-end">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
                disabled={!isDirty && selectedImages.length === 0 && removedImages.length === 0 && defaultImageIndex === (initialData?.defaultImageIndex ?? 0)}
              >
                {isEditing ? 'Update Property' : 'Create Property'}
              </Button>
            </HStack>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}
