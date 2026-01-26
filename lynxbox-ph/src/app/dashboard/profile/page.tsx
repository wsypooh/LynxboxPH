'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Avatar,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  FormControl,
  FormLabel,
  Input,
  useToast,
  useColorModeValue,
  InputGroup,
  InputLeftElement,
  Icon,
  Divider,
  Badge,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiCreditCard, FiCalendar, FiCheckCircle, FiKey, FiShield } from 'react-icons/fi';
import { useAuth } from '@/features/auth/AuthContext';
import dynamic from 'next/dynamic';

// Dynamically import the components with no SSR
const ChangePasswordForm = dynamic(
  () => import('@/components/auth/ChangePasswordForm'),
  { ssr: false }
);

const TwoFactorAuth = dynamic(
  () => import('@/components/auth/TwoFactorAuth'),
  { ssr: false }
);

export default function ProfilePage() {
  const { user, signOut, updateUserAttributes } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.attributes?.name || user.username || '',
        email: user.attributes?.email || user.signInDetails?.loginId || '',
        phone: user.attributes?.phone_number || '',
        address: user.attributes?.address || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, selectionStart } = e.target;
    
    // Format phone number as user types
    let formattedValue = value;
    let cursorPosition = selectionStart;
    
    if (name === 'phone') {
      // Store the cursor position before formatting
      const cursorWasAtEnd = selectionStart === value.length;
      
      // Remove all non-digit characters
      const digits = value.replace(/\D/g, '');
      
      // Format as +63 XXX XXX XXXX or 0XXX XXX XXXX
      if (digits.startsWith('63') || digits.startsWith('+63')) {
        const cleanNumber = digits.replace(/^\+?63/, '');
        formattedValue = `+63 ${cleanNumber.substring(0, 3)}${cleanNumber.length > 3 ? ' ' : ''}${cleanNumber.substring(3, 6)}${cleanNumber.length > 6 ? ' ' : ''}${cleanNumber.substring(6, 10)}`.trim();
      } else if (digits.startsWith('0')) {
        const cleanNumber = digits.substring(1);
        formattedValue = `0${cleanNumber.substring(0, 3)}${cleanNumber.length > 3 ? ' ' : ''}${cleanNumber.substring(3, 6)}${cleanNumber.length > 6 ? ' ' : ''}${cleanNumber.substring(6, 10)}`.trim();
      } else if (digits) {
        formattedValue = `0${digits.substring(0, 3)}${digits.length > 3 ? ' ' : ''}${digits.substring(3, 6)}${digits.length > 6 ? ' ' : ''}${digits.substring(6, 10)}`.trim();
      }
      
      // Adjust cursor position after formatting
      if (!cursorWasAtEnd && selectionStart) {
        // Count the number of non-digit characters before the cursor
        const nonDigitsBeforeCursor = value.substring(0, selectionStart).replace(/\d/g, '').length;
        // Count the number of digits before the cursor
        const digitsBeforeCursor = selectionStart - nonDigitsBeforeCursor;
        
        // Find the new cursor position by counting digits and non-digits
        let newCursorPos = 0;
        let digitsCount = 0;
        
        for (let i = 0; i < formattedValue.length && digitsCount < digitsBeforeCursor; i++) {
          if (/\d/.test(formattedValue[i])) {
            digitsCount++;
          }
          newCursorPos = i + 1;
        }
        
        // Set the cursor position after the state update
        setTimeout(() => {
          const input = e.target;
          if (input) {
            input.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue,
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (formData.phone && !/^(\+?63|0)?[0-9]{10}$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Please enter a valid Philippine phone number (e.g., 09171234567 or +639171234567)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumberForCognito = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with +63
    if (digits.startsWith('0')) {
      return `+63${digits.substring(1)}`;
    }
    
    // If it doesn't start with +, add +63
    if (!digits.startsWith('+')) {
      return `+63${digits}`;
    }
    
    // If it's already in international format, return as is
    return phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const attributesToUpdate: Record<string, string> = {
        name: formData.name,
        email: formData.email,
      };
      
      // Format phone number for Cognito
      if (formData.phone) {
        attributesToUpdate.phone_number = formatPhoneNumberForCognito(formData.phone);
      }
      
      if (formData.address) {
        attributesToUpdate.address = formData.address;
      }
      
      console.log('Submitting attributes:', attributesToUpdate);
      
      await updateUserAttributes(attributesToUpdate);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'There was an error updating your profile. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (!user) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>Please sign in to view your profile.</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <HStack align="start" spacing={6}>
        {/* Left Sidebar */}
        <Box w="300px" flexShrink={0}>
          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} overflow="hidden">
            <Box bg="blue.500" h="80px" />
            <Box px={6} mt={-10} textAlign="center">
              <Avatar 
                size="xl" 
                name={formData.name} 
                src={user.attributes?.picture} 
                borderWidth={4}
                borderColor={cardBg}
                bg="blue.100"
                color="blue.600"
                fontSize="2xl"
                fontWeight="bold"
              >
                {getInitials(formData.name)}
              </Avatar>
              <Heading size="md" mt={4} mb={1}>
                {formData.name}
              </Heading>
              <Text color="gray.500" mb={4}>
                {formData.email}
              </Text>
              <Badge colorScheme="green" mb={6}>
                <HStack spacing={1}>
                  <Icon as={FiCheckCircle} />
                  <Text>Verified</Text>
                </HStack>
              </Badge>
              
              <VStack spacing={4} align="stretch" mb={6}>
                <Box>
                  <Text fontSize="sm" color="gray.500">Member Since</Text>
                  <Text fontWeight="medium">
                  {user.attributes?.createdAt 
                    ? new Date(parseInt(user.attributes.createdAt) * 1000).toLocaleDateString() 
                    : 'N/A'}
                  </Text>
                </Box>
              </VStack>
              
              <Button 
                colorScheme="red" 
                variant="outline" 
                w="full" 
                onClick={handleSignOut}
                leftIcon={<Icon as={FiLock} />}
              >
                Sign Out
              </Button>
            </Box>
          </Card>
        </Box>

        {/* Main Content */}
        <Box flex={1}>
          <Tabs variant="enclosed">
            <TabList>
              <Tab>Profile</Tab>
              <Tab>Security</Tab>
              <Tab>Subscription</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={6}>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} overflow="hidden">
                  <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                    <Heading size="md">Profile Information</Heading>
                    <Text color="gray.500" fontSize="sm">Update your profile information and email address</Text>
                  </CardHeader>
                  
                  <CardBody p={6}>
                    <form onSubmit={handleSubmit}>
                      <VStack spacing={6} align="stretch">
                        <FormControl id="name" isInvalid={!!errors.name} isRequired>
                          <FormLabel>Full Name</FormLabel>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            isReadOnly={!isEditing}
                            placeholder="Your full name"
                          />
                          {errors.name && <Text color="red.500" fontSize="sm" mt={1}>{errors.name}</Text>}
                        </FormControl>

                        <FormControl id="email" isInvalid={!!errors.email} isRequired>
                          <FormLabel>Email address</FormLabel>
                          <InputGroup>
                            <InputLeftElement pointerEvents="none">
                              <Icon as={FiMail} color="gray.400" />
                            </InputLeftElement>
                            <Input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              isReadOnly={!isEditing}
                              placeholder="your@email.com"
                            />
                          </InputGroup>
                          {errors.email && <Text color="red.500" fontSize="sm" mt={1}>{errors.email}</Text>}
                        </FormControl>

                        <FormControl id="phone" isInvalid={!!errors.phone}>
                          <FormLabel>Phone Number</FormLabel>
                          <InputGroup>
                            <InputLeftElement pointerEvents="none">
                              <Icon as={FiPhone} color="gray.400" />
                            </InputLeftElement>
                            <Input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              isReadOnly={!isEditing}
                              placeholder="09171234567 or +639171234567"
                              maxLength={13}
                            />
                          </InputGroup>
                          {errors.phone && <Text color="red.500" fontSize="sm" mt={1}>{errors.phone}</Text>}
                        </FormControl>

                        <FormControl id="address">
                          <FormLabel>Address</FormLabel>
                          <InputGroup>
                            <InputLeftElement pointerEvents="none">
                              <Icon as={FiMapPin} color="gray.400" />
                            </InputLeftElement>
                            <Input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              isReadOnly={!isEditing}
                              placeholder="Your address"
                            />
                          </InputGroup>
                        </FormControl>

                        <HStack spacing={4} mt={8}>
                          {isEditing ? (
                            <>
                              <Button 
                                colorScheme="blue" 
                                type="submit"
                                isLoading={isSubmitting}
                                loadingText="Saving..."
                              >
                                Save Changes
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setIsEditing(false);
                                  setErrors({});
                                  // Reset form data to current user data
                                  if (user) {
                                    setFormData({
                                      name: user.attributes?.name || user.username || '',
                                      email: user.attributes?.email || user.signInDetails?.loginId || '',
                                      phone: user.attributes?.phone_number?.replace(/^\+?63/, '0') || '',
                                      address: user.attributes?.address || '',
                                    });
                                  }
                                }}
                                isDisabled={isSubmitting}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button 
                              colorScheme="blue" 
                              onClick={() => setIsEditing(true)}
                              leftIcon={<Icon as={FiUser} />}
                            >
                              Edit Profile
                            </Button>
                          )}
                        </HStack>
                      </VStack>
                    </form>
                  </CardBody>
                </Card>
              </TabPanel>

              <TabPanel p={0} pt={6}>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} overflow="hidden">
                  <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                    <Heading size="md">Security</Heading>
                    <Text color="gray.500" fontSize="sm">Update your password and secure your account</Text>
                  </CardHeader>
                  <CardBody p={6}>
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <Heading size="sm" mb={4} display="flex" alignItems="center">
                          <FiKey style={{ marginRight: '8px' }} />
                          Change Password
                        </Heading>
                        <Text color="gray.600" mb={4}>
                          Update your account password. Make sure it&apos;s strong and unique.
                        </Text>
                        <ChangePasswordForm />
                      </Box>
                      
                      <Divider my={6} />
                      
                      <Box>
                        <TwoFactorAuth />
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>

              <TabPanel p={0} pt={6}>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} overflow="hidden">
                  <CardHeader borderBottomWidth="1px" borderColor={borderColor}>
                    <Heading size="md">Subscription</Heading>
                    <Text color="gray.500" fontSize="sm">Manage your subscription and billing</Text>
                  </CardHeader>
                  <CardBody p={6}>
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <Heading size="sm" mb={2}>Current Plan</Heading>
                        <Text color="gray.600" mb={4}>
                          You&apos;re currently on the <strong>Free</strong> plan.
                        </Text>
                        <Button colorScheme="blue" w="fit-content">
                          Upgrade Plan
                        </Button>
                      </Box>
                      
                      <Divider my={2} />
                      
                      <Box>
                        <Heading size="sm" mb={2}>Billing Information</Heading>
                        <Text color="gray.600" mb={4}>
                          Update your payment method and view billing history.
                        </Text>
                        <Button variant="outline" w="fit-content">
                          Manage Billing
                        </Button>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </HStack>
    </Container>
  );
}