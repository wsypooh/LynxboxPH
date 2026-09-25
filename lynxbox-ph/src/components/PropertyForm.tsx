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
import { validateImageFile } from '@/lib/utils';
import { PH_PROVINCES, getCitiesForProvince } from '@/data/philippineLocations';
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
  // 'unlisted' is deliberately not a normal choice here — it's system-set by
  // reconcilePropertyListingsForPlan() when a downgrade puts the account over its plan's
  // active-listing cap. Included in the enum only so a currently-unlisted property's status
  // round-trips correctly; the option itself is only ever rendered when already selected.
  status: z.enum(['available', 'rented', 'sold', 'maintenance', 'unlisted'] as const).default('available'),
  contactInfo: z.object({
    name: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().regex(/^[+\d][\d\s\-()\\.]{6,18}$/, 'Enter a valid phone number'),
  }),
});

type PropertyFormData = z.infer<typeof propertySchema>;

// A new image (not yet uploaded, previewed via a local blob URL) or an existing one already
// saved as an S3 key. Keeping both in one array means the on-screen order is always the
// source of truth — no separate index bookkeeping to keep in sync.
type ImageItem =
  | { kind: 'existing'; key: string }
  | { kind: 'new'; file: File; previewUrl: string };

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
  const [images, setImages] = useState<ImageItem[]>([]);
  const [defaultImageIndex, setDefaultImageIndex] = useState<number | undefined>(0);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Images upload direct-to-S3 keyed by property id, which a brand-new listing doesn't have
  // yet — so the id is generated client-side upfront and reused for the form's lifetime,
  // whether creating or editing (mirrors TenantContract.id's crypto.randomUUID() pattern).
  const [activePropertyId] = useState<string>(() => propertyId || initialData?.id || crypto.randomUUID());

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

  const descriptionLength = watch('description')?.length ?? 0;

  // Cascading province -> city select. An existing property's stored city/province might
  // not exactly match the canonical PSGC list (typos, old data) — if so, keep it selectable
  // as an extra option rather than silently blanking or overwriting it.
  const selectedProvince = watch('location.province');
  const selectedCity = watch('location.city');
  const provinceOptions = selectedProvince && !PH_PROVINCES.includes(selectedProvince)
    ? [selectedProvince, ...PH_PROVINCES]
    : PH_PROVINCES;
  const citiesForProvince = selectedProvince ? getCitiesForProvince(selectedProvince) : [];
  const cityOptions = selectedCity && !citiesForProvince.includes(selectedCity)
    ? [selectedCity, ...citiesForProvince]
    : citiesForProvince;

  // Kept separate from the numeric RHF field value: NumberInput's precision formatting
  // (e.g. re-rendering "12" as "12.00") would otherwise stomp a decimal point mid-typing,
  // since feeding the parsed number straight back in as the controlled value collapses
  // "12." back down to "12" before a digit after the decimal can be typed.
  const [areaInputValue, setAreaInputValue] = useState<string>(
    initialData?.features?.area !== undefined ? String(initialData.features.area) : ''
  );

  useEffect(() => {
    if (initialData?.features?.area !== undefined) {
      setAreaInputValue(String(initialData.features.area));
    }
  }, [initialData]);

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

    setImages(prev => {
      const newItems: ImageItem[] = validFiles.map(file => ({
        kind: 'new',
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      if (prev.length === 0 && defaultImageIndex === undefined) {
        setDefaultImageIndex(0);
      }
      return [...prev, ...newItems];
    });

    // Allow re-selecting the same file (otherwise onChange won't fire again for it)
    event.target.value = '';
  }, [toast, defaultImageIndex]);

  const removeImage = useCallback((index: number) => {
    const removed = images[index];
    if (removed?.kind === 'new') {
      URL.revokeObjectURL(removed.previewUrl);
    }
    setImages(prev => prev.filter((_, i) => i !== index));

    // Adjust defaultImageIndex if necessary
    if (defaultImageIndex === index) {
      // If deleting the default image, set to 0 if images remain, undefined if none
      setDefaultImageIndex(images.length > 1 ? 0 : undefined);
    } else if (defaultImageIndex !== undefined && defaultImageIndex > index) {
      // If deleting an image before the default, shift the default index down
      setDefaultImageIndex(prev => prev !== undefined ? prev - 1 : undefined);
    }
  }, [images, defaultImageIndex]);

  const handleDefaultImageSelect = useCallback((index: number) => {
    setDefaultImageIndex(index);
  }, []);

  // Load existing images when editing
  useEffect(() => {
    if (isEditing && initialData?.images) {
      setImages(initialData.images.map(key => ({ kind: 'existing', key })));
      setDefaultImageIndex(initialData.defaultImageIndex ?? 0);
    }
  }, [isEditing, initialData]);


  const onSubmit = async (data: PropertyFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress(0);

      // Upload any newly-selected images straight to S3 (presigned URL), one at a time so
      // the progress bar reflects real per-file upload progress.
      const newItems = images.filter((item): item is Extract<ImageItem, { kind: 'new' }> => item.kind === 'new');
      const uploadedKeys: string[] = [];
      for (let i = 0; i < newItems.length; i++) {
        const { key } = await propertyService.uploadPropertyImage(activePropertyId, newItems[i].file, (progress) => {
          setUploadProgress(((i + progress / 100) / newItems.length) * 100);
        });
        uploadedKeys.push(key);
      }

      // Rebuild the list in the user's chosen order, swapping each new item for its
      // now-uploaded S3 key.
      let uploadedIndex = 0;
      const finalImages = images.map(item => (item.kind === 'existing' ? item.key : uploadedKeys[uploadedIndex++]));

      // Existing keys present before this edit but no longer in the list need their S3
      // objects actually deleted — the property record's `images` above already excludes them.
      const removedExistingKeys = isEditing
        ? (initialData?.images || []).filter(key => !finalImages.includes(key))
        : [];

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
        images: finalImages,
        defaultImageIndex: finalImages.length > 0 ? defaultImageIndex : undefined,
        ...(removedExistingKeys.length > 0 && { removeImages: removedExistingKeys }), // Include removed images if any
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
        result = await propertyService.createProperty({ ...propertyData, id: activePropertyId });

        if (!result) {
          throw new Error('Create failed: No data returned from server');
        }
      }

      onSuccess?.(result);

      // Reset form state after successful submission
      images.forEach(item => {
        if (item.kind === 'new') URL.revokeObjectURL(item.previewUrl);
      });
      setImages([]);

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

  const hasNewImages = images.some(item => item.kind === 'new');
  const hasRemovedImages = isEditing && (initialData?.images || []).some(
    key => !images.some(item => item.kind === 'existing' && item.key === key)
  );

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
                      maxLength={1000}
                    />
                    <Flex justify="space-between" mt={1}>
                      <Text color="red.500" fontSize="sm">
                        {errors.description?.message}
                      </Text>
                      <Text fontSize="xs" color={descriptionLength > 1000 ? 'red.500' : 'gray.500'}>
                        {descriptionLength}/1000
                      </Text>
                    </Flex>
                  </FormControl>

                  <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
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
                        {initialData?.status === 'unlisted' && (
                          <option value="unlisted">Unlisted (plan limit)</option>
                        )}
                      </Select>
                      {initialData?.status === 'unlisted' && (
                        <Text fontSize="xs" color="orange.600" mt={1}>
                          This listing was automatically unlisted because it is over your plan&apos;s active listing limit. Choose a different status here to re-list it, or upgrade your plan.
                        </Text>
                      )}
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
                  </Stack>
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

                  <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
                    <FormControl isInvalid={!!errors.location?.province}>
                      <FormLabel>Province</FormLabel>
                      <Select
                        {...register('location.province', {
                          onChange: () => setValue('location.city', ''),
                        })}
                        placeholder="Select province"
                      >
                        {provinceOptions.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </Select>
                      <Text color="red.500" fontSize="sm">
                        {errors.location?.province?.message}
                      </Text>
                    </FormControl>

                    <FormControl isInvalid={!!errors.location?.city}>
                      <FormLabel>City</FormLabel>
                      <Select
                        {...register('location.city')}
                        placeholder={selectedProvince ? 'Select city/municipality' : 'Select a province first'}
                        isDisabled={!selectedProvince}
                      >
                        {cityOptions.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </Select>
                      <Text color="red.500" fontSize="sm">
                        {errors.location?.city?.message}
                      </Text>
                    </FormControl>
                  </Stack>
                </VStack>
              </CardBody>
            </Card>

            {/* Features */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Features</Heading>

                  <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                    <FormControl isInvalid={!!errors.features?.area}>
                      <FormLabel>Area (m²)</FormLabel>
                      <Controller
                        control={control}
                        name="features.area"
                        render={({ field }) => (
                          <NumberInput
                            {...field}
                            value={areaInputValue}
                            onChange={(valueString) => {
                              setAreaInputValue(valueString);
                              const parsed = parseFloat(valueString);
                              field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                            }}
                            min={0}
                            precision={2}
                            step={0.01}
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
                      <FormLabel>Floor</FormLabel>
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
                      <Text fontSize="xs" color="gray.500">
                        Which floor the property is on (0 = ground floor)
                      </Text>
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
                  
                  <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
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
                  </Stack>
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

                  {images.length > 0 && (
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
                        {images.map((item, index) => {
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
                                {item.kind === 'existing' ? (
                                  <SecureImage
                                    propertyId={activePropertyId}
                                    imageKey={item.key}
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
                                    src={item.previewUrl}
                                    alt={`Preview ${index + 1}`}
                                    w="150px"
                                    h="150px"
                                    objectFit="cover"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                      console.error(`Image preview error for index ${index}:`, item.previewUrl);
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
                disabled={!isDirty && !hasNewImages && !hasRemovedImages && defaultImageIndex === (initialData?.defaultImageIndex ?? 0)}
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
