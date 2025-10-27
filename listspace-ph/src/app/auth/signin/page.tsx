'use client'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
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
import { signIn } from 'aws-amplify/auth'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type SignInFormData = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const form = useForm<SignInFormData>({
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

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      await signIn({
        username: data.email,
        password: data.password,
      })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
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
          <Alert status="success">
            <AlertIcon />
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box w="full">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!form.formState.errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  {...form.register('email')}
                  type="email"
                  placeholder="Enter your email"
                />
                {form.formState.errors.email && (
                  <Text color="red.500" fontSize="sm">
                    {form.formState.errors.email.message}
                  </Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!form.formState.errors.password}>
                <FormLabel>Password</FormLabel>
                <Input
                  {...form.register('password')}
                  type="password"
                  placeholder="Enter your password"
                />
                {form.formState.errors.password && (
                  <Text color="red.500" fontSize="sm">
                    {form.formState.errors.password.message}
                  </Text>
                )}
              </FormControl>

              <Button
                type="submit"
                colorScheme="primary"
                size="lg"
                isLoading={isLoading}
                loadingText="Signing In..."
              >
                Sign In
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
