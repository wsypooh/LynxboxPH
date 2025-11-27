'use client'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  Alert,
  AlertIcon,
  Link as ChakraLink,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, type SignInInput } from 'aws-amplify/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import MFAVerification from '@/components/auth/MFAVerification'

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type SignInFormData = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showMFA, setShowMFA] = useState(false)
  const [username, setUsername] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: data.email,
        password: data.password,
      } as SignInInput)
      
      // If MFA is required, show the MFA verification form
      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        setUsername(data.email)
        setShowMFA(true)
        return
      }
      
      // If already signed in, redirect to dashboard
      if (isSignedIn) {
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleMFASuccess = () => {
    router.push('/dashboard')
  }
  
  const handleBackToSignIn = () => {
    setShowMFA(false)
    setError('')
  }

  // Show MFA verification form if needed
  if (showMFA) {
    return (
      <Container maxW="md" py={12}>
        <MFAVerification 
          username={username} 
          onSuccess={handleMFASuccess}
          onBack={handleBackToSignIn}
        />
      </Container>
    )
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">Welcome Back</Heading>
          <Text color="gray.600">
            Sign in to your ListSpace PH account
          </Text>
        </VStack>

        {successMessage && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box w="full">
          <form onSubmit={handleSubmit(handleSignIn)}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="username"
                />
                <FormErrorMessage>
                  {errors.email?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.password}>
                <FormLabel>Password</FormLabel>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <FormErrorMessage>
                  {errors.password?.message}
                </FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                width="full"
                mt={4}
                isLoading={isLoading}
                loadingText="Signing in..."
              >
                Sign in
              </Button>
            </Stack>
          </form>
        </Box>

        <VStack spacing={2} textAlign="center">
          <Text>
            Don&apos;t have an account?{' '}
            <ChakraLink as={Link} href="/auth/signup" color="primary.500">
              Sign up here
            </ChakraLink>
          </Text>
          <ChakraLink as={Link} href="/auth/forgot-password" color="primary.500">
            Forgot your password?
          </ChakraLink>
        </VStack>
      </VStack>
    </Container>
  )
}
