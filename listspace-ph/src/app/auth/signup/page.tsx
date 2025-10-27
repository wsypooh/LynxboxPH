'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp, getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  Text,
  useToast,
  Code,
  Link as ChakraLink,
  useColorModeValue,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

// Debug component to display environment variables
const DebugInfo = ({ debugInfo }: { debugInfo: Record<string, any> }) => {
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <Box mt={8} p={4} bg="gray.50" borderRadius="md">
      <Text fontWeight="bold" mb={2}>Debug Information:</Text>
      <Code whiteSpace="pre" p={2} display="block">
        {JSON.stringify(debugInfo, null, 2)}
      </Code>
    </Box>
  );
};

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const router = useRouter();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Debug: Log environment variables and config
  useEffect(() => {
    const debugData = {
      env: {
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID,
        identityPoolId: process.env.NEXT_PUBLIC_AWS_IDENTITY_POOL_ID,
      },
      window: typeof window !== 'undefined' ? 'available' : 'not available',
    };
    
    console.log('Debug Info:', debugData);
    setDebugInfo(debugData);
    
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        console.log('Current user:', user);
      } catch (error) {
        console.log('No authenticated user:', error);
      }
    };
    
    checkAuth();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsLoading(true);
      setError('');
      
      await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
            name: data.name,
          },
        },
      });

      toast({
        title: 'Account created!',
        description: 'Please check your email to confirm your account.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      router.push(`/auth/confirm-signup?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Box display="flex" gap={8}>
        {/* Signup Form */}
        <Box flex={1} maxW="md">
          <Box
            p={8}
            borderWidth={1}
            borderRadius="lg"
            borderColor={borderColor}
            bg={bgColor}
            boxShadow="md"
          >
            <VStack spacing={6} align="stretch">
              <VStack spacing={2} textAlign="center">
                <Text fontSize="2xl" fontWeight="bold">Create an account</Text>
                <Text color="gray.500">
                  Already have an account?{' '}
                  <ChakraLink as={Link} href="/auth/signin" color="blue.500">
                    Sign in
                  </ChakraLink>
                </Text>
              </VStack>

              {error && (
                <Box p={3} bg="red.50" borderRadius="md" color="red.600">
                  <Text fontWeight="bold">Error:</Text>
                  <Text>{error}</Text>
                </Box>
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <VStack spacing={4}>
                  <FormControl isInvalid={!!errors.name}>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      {...register('name')}
                    />
                    <FormErrorMessage>
                      {errors.name?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.email}>
                    <FormLabel>Email address</FormLabel>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...register('email')}
                    />
                    <FormErrorMessage>
                      {errors.email?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.password}>
                    <FormLabel>Password</FormLabel>
                    <InputGroup>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password')}
                      />
                      <InputRightElement>
                        <IconButton
                          variant="ghost"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                          onClick={() => setShowPassword(!showPassword)}
                        />
                      </InputRightElement>
                    </InputGroup>
                    <FormErrorMessage>
                      {errors.password?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!errors.confirmPassword}>
                    <FormLabel>Confirm Password</FormLabel>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                    />
                    <FormErrorMessage>
                      {errors.confirmPassword?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    width="full"
                    mt={4}
                    isLoading={isLoading}
                    loadingText="Creating account..."
                  >
                    Create Account
                  </Button>
                </VStack>
              </form>
              
              {/* Debug information */}
              <DebugInfo debugInfo={debugInfo} />
            </VStack>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}