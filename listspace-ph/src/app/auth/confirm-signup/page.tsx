'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
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
  useColorModeValue,
  Heading,
  HStack,
  Spinner,
} from '@chakra-ui/react';

export default function ConfirmSignupPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      // Redirect to signup if no email is provided
      router.push('/auth/signup');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code.trim(),
      });
      
      setIsConfirmed(true);
      
      toast({
        title: 'Email verified!',
        description: 'Your email has been successfully verified.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to signin after a short delay
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error confirming sign up:', error);
      setError(error.message || 'An error occurred while verifying your email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;
    
    setIsResending(true);
    setError('');
    
    try {
      await resendSignUpCode({
        username: email,
      });
      
      toast({
        title: 'Verification code sent!',
        description: 'A new verification code has been sent to your email.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error resending code:', error);
      setError(error.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  if (isConfirmed) {
    return (
      <Container maxW="container.sm" py={12}>
        <Box
          p={8}
          borderWidth={1}
          borderRadius="lg"
          borderColor={borderColor}
          bg={bgColor}
          boxShadow="md"
          textAlign="center"
        >
          <VStack spacing={6}>
            <Heading as="h1" size="lg">Email Verified Successfully!</Heading>
            <Text>Your email has been successfully verified. Redirecting you to sign in...</Text>
            <Spinner size="lg" />
          </VStack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={12}>
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
            <Heading as="h1" size="lg">Verify Your Email</Heading>
            <Text color="gray.500">
              We&apos;ve sent a verification code to <strong>{email}</strong>
            </Text>
          </VStack>

          {error && (
            <Box p={3} bg="red.50" borderRadius="md" color="red.600">
              <Text>{error}</Text>
            </Box>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Verification Code</FormLabel>
                <Input
                  type="text"
                  placeholder="Enter the 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                width="full"
                mt={4}
                isLoading={isLoading}
                loadingText="Verifying..."
              >
                Verify Email
              </Button>

              <HStack mt={4} justifyContent="center" spacing={2}>
                <Text color="gray.500">Didn&apos;t receive a code?</Text>
                <Button
                  variant="link"
                  colorScheme="blue"
                  onClick={handleResendCode}
                  isLoading={isResending}
                  loadingText="Sending..."
                >
                  Resend Code
                </Button>
              </HStack>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Container>
  );
}
