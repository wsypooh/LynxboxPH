'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Checkbox,
  Button,
  useToast,
  HStack,
  Box,
  Text,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import { Plus, X, Upload } from 'lucide-react'
import { PropertyService } from '@/features/properties/services/propertyService'
import { PropertyType, PropertyStatus } from '@/features/properties/types'

export default function AddPropertyPage() {
  const router = useRouter()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'office' as PropertyType,
    price: 0,
    location: {
      address: '',
      city: '',
      province: '',
      coordinates: {
        lat: 0,
        lng: 0
      }
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
    status: 'available' as PropertyStatus,
    contactInfo: {
      name: '',
      phone: '',
      email: ''
    }
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      if (parent === 'location' && child === 'coordinates') {
        const [coord, coordType] = name.split('.').slice(1)
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            coordinates: {
              ...prev.location.coordinates,
              [coordType]: parseFloat(value)
            }
          }
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: type === 'number' ? parseFloat(value) : value
          }
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
      }))
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    const [parent, child] = name.split('.')
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev as any)[parent],
        [child]: checked
      }
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImageFiles = Array.from(files).slice(0, 5 - imageFiles.length)
    
    // Create previews
    const newImagePreviews = newImageFiles.map(file => URL.createObjectURL(file))
    
    setImageFiles(prev => [...prev, ...newImageFiles])
    setImagePreviews(prev => [...prev, ...newImagePreviews])
  }

  const removeImage = (index: number) => {
    const newImageFiles = [...imageFiles]
    const newImagePreviews = [...imagePreviews]
    
    URL.revokeObjectURL(newImagePreviews[index])
    newImageFiles.splice(index, 1)
    newImagePreviews.splice(index, 1)
    
    setImageFiles(newImageFiles)
    setImagePreviews(newImagePreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (imageFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Please upload at least one image',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // In a real app, you would upload the images to a storage service first
      // and then save the returned URLs with the property data
      const imageUrls = imagePreviews // In a real app, these would be the uploaded image URLs
      
      const propertyData = {
        ...formData,
        images: imageUrls,
        viewCount: 0,
        ownerId: 'current-user-id', // Replace with actual user ID from auth context
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      await PropertyService.createProperty(propertyData)
      
      toast({
        title: 'Success',
        description: 'Property added successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      
      router.push('/properties')
    } catch (error) {
      console.error('Error adding property:', error)
      toast({
        title: 'Error',
        description: 'Failed to add property. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl">Add New Property</Heading>
        
        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={6}>
            {/* Basic Information */}
            <Box w="100%" p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>Basic Information</Heading>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Title</FormLabel>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter property title"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter property description"
                    rows={4}
                  />
                </FormControl>
                
                <HStack w="100%" spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Type</FormLabel>
                    <Select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="office">Office</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="retail">Retail</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="industrial">Industrial</option>
                      <option value="mixed-use">Mixed Use</option>
                    </Select>
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Status</FormLabel>
                    <Select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="available">Available</option>
                      <option value="rented">Rented</option>
                      <option value="pending">Pending</option>
                      <option value="maintenance">Maintenance</option>
                    </Select>
                  </FormControl>
                </HStack>
                
                <FormControl isRequired>
                  <FormLabel>Price (PHP)</FormLabel>
                  <NumberInput min={0} precision={2}>
                    <NumberInputField
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="Enter price"
                    />
                  </NumberInput>
                </FormControl>
              </VStack>
            </Box>
            
            {/* Location */}
            <Box w="100%" p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>Location</Heading>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Address</FormLabel>
                  <Input
                    name="location.address"
                    value={formData.location.address}
                    onChange={handleInputChange}
                    placeholder="Enter full address"
                  />
                </FormControl>
                
                <HStack w="100%" spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>City</FormLabel>
                    <Input
                      name="location.city"
                      value={formData.location.city}
                      onChange={handleInputChange}
                      placeholder="City"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Province</FormLabel>
                    <Input
                      name="location.province"
                      value={formData.location.province}
                      onChange={handleInputChange}
                      placeholder="Province"
                    />
                  </FormControl>
                </HStack>
                
                <HStack w="100%" spacing={4}>
                  <FormControl>
                    <FormLabel>Latitude</FormLabel>
                    <NumberInput precision={6} step={0.000001}>
                      <NumberInputField
                        name="location.coordinates.lat"
                        value={formData.location.coordinates.lat}
                        onChange={handleInputChange}
                        placeholder="Latitude"
                      />
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Longitude</FormLabel>
                    <NumberInput precision={6} step={0.000001}>
                      <NumberInputField
                        name="location.coordinates.lng"
                        value={formData.location.coordinates.lng}
                        onChange={handleInputChange}
                        placeholder="Longitude"
                      />
                    </NumberInput>
                  </FormControl>
                </HStack>
                
                <Button leftIcon={<Plus size={16} />} variant="outline" size="sm" onClick={onOpen}>
                  Pick from map
                </Button>
              </VStack>
            </Box>
            
            {/* Features */}
            <Box w="100%" p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>Features</Heading>
              <VStack spacing={4}>
                <HStack w="100%" spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Area (sqm)</FormLabel>
                    <NumberInput min={0} precision={2}>
                      <NumberInputField
                        name="features.area"
                        value={formData.features.area}
                        onChange={handleInputChange}
                        placeholder="Area in square meters"
                      />
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Parking Spaces</FormLabel>
                    <NumberInput min={0} defaultValue={0}>
                      <NumberInputField
                        name="features.parking"
                        value={formData.features.parking}
                        onChange={handleInputChange}
                        placeholder="Number of parking spaces"
                      />
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Floors</FormLabel>
                    <NumberInput min={1} defaultValue={1}>
                      <NumberInputField
                        name="features.floors"
                        value={formData.features.floors}
                        onChange={handleInputChange}
                        placeholder="Number of floors"
                      />
                    </NumberInput>
                  </FormControl>
                </HStack>
                
                <HStack w="100%" spacing={8}>
                  <Checkbox
                    name="features.furnished"
                    isChecked={formData.features.furnished}
                    onChange={handleCheckboxChange}
                  >
                    Furnished
                  </Checkbox>
                  
                  <Checkbox
                    name="features.aircon"
                    isChecked={formData.features.aircon}
                    onChange={handleCheckboxChange}
                  >
                    Air Conditioning
                  </Checkbox>
                  
                  <Checkbox
                    name="features.wifi"
                    isChecked={formData.features.wifi}
                    onChange={handleCheckboxChange}
                  >
                    WiFi
                  </Checkbox>
                  
                  <Checkbox
                    name="features.security"
                    isChecked={formData.features.security}
                    onChange={handleCheckboxChange}
                  >
                    24/7 Security
                  </Checkbox>
                </HStack>
              </VStack>
            </Box>
            
            {/* Contact Information */}
            <Box w="100%" p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>Contact Information</Heading>
              <VStack spacing={4}>
                <HStack w="100%" spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Contact Name</FormLabel>
                    <Input
                      name="contactInfo.name"
                      value={formData.contactInfo.name}
                      onChange={handleInputChange}
                      placeholder="Contact person's name"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      name="contactInfo.email"
                      value={formData.contactInfo.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                    />
                  </FormControl>
                </HStack>
                
                <FormControl isRequired>
                  <FormLabel>Phone Number</FormLabel>
                  <Input
                    type="tel"
                    name="contactInfo.phone"
                    value={formData.contactInfo.phone}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                  />
                </FormControl>
              </VStack>
            </Box>
            
            {/* Image Upload */}
            <Box w="100%" p={6} borderWidth={1} borderRadius="lg">
              <Heading size="md" mb={4}>Property Images</Heading>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Upload Images (Max 5, at least 1 required)</FormLabel>
                  <Box
                    borderWidth={1}
                    borderStyle="dashed"
                    borderRadius="md"
                    p={6}
                    textAlign="center"
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                  >
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      display="none"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <VStack spacing={2}>
                        <Upload size={32} />
                        <Text>Click to upload or drag and drop</Text>
                        <Text fontSize="sm" color="gray.500">PNG, JPG, JPEG up to 5MB</Text>
                      </VStack>
                    </label>
                  </Box>
                </FormControl>
                
                {imagePreviews.length > 0 && (
                  <VStack w="100%" align="start" spacing={4}>
                    <Text fontWeight="medium">Preview ({imagePreviews.length}/5)</Text>
                    <HStack spacing={4} flexWrap="wrap">
                      {imagePreviews.map((preview, index) => (
                        <Box key={index} position="relative">
                          <Box
                            as="img"
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            boxSize="100px"
                            objectFit="cover"
                            borderRadius="md"
                            borderWidth={1}
                          />
                          <IconButton
                            aria-label="Remove image"
                            icon={<X size={16} />}
                            size="xs"
                            position="absolute"
                            top={-2}
                            right={-2}
                            colorScheme="red"
                            borderRadius="full"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeImage(index)
                            }}
                          />
                        </Box>
                      ))}
                    </HStack>
                  </VStack>
                )}
              </VStack>
            </Box>
            
            {/* Submit Button */}
            <HStack w="100%" justifyContent="flex-end" spacing={4} pt={4}>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/properties')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
                loadingText="Saving..."
              >
                Add Property
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
      
      {/* Map Modal (Placeholder) */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Location on Map</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={6}>
            <Box h="400px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
              <Text color="gray.500">Map integration would go here</Text>
            </Box>
            <HStack mt={4} justifyContent="flex-end">
              <Button variant="outline" onClick={onClose} mr={2}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={() => {
                // In a real app, this would set the coordinates from the map selection
                setFormData(prev => ({
                  ...prev,
                  location: {
                    ...prev.location,
                    coordinates: {
                      lat: 14.5995, // Example coordinates (Manila)
                      lng: 120.9842
                    }
                  }
                }))
                onClose()
              }}>
                Confirm Location
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}
