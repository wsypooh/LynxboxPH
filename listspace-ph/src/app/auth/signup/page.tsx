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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp, confirmSignUp } from 'aws-amplify/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const confirmationSchema = z.object({
  confirmationCode: z.string().min(6, 'Confirmation code must be 6 digits'),
})

type SignUpFormData = z.infer<typeof signUpSchema>
type ConfirmationFormData = z.infer<typeof confirmationSchema>

export default function SignUpPage() {
  const [step, setStep] = useState<'signup' | 'confirm'>('signup')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const confirmForm = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
  })

  const onSignUp = async (data: SignUpFormData) => {
    setIsLoading(true)
    setError('')

    try {
      await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
            name: data.name,
          },
        },
      })
      setEmail(data.email)
      setStep('confirm')
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up')
    } finally {
      setIsLoading(false)
    }
  }

  const onConfirm = async (data: ConfirmationFormData) => {
    setIsLoading(true)
    setError('')

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: data.confirmationCode,
      })
      router.push('/auth/signin?message=Account confirmed successfully')
    } catch (err: any) {
      setError(err.message || 'An error occurred during confirmation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">
            {step === 'signup' ? 'Create Your Account' : 'Confirm Your Email'}
          </Heading>
          <Text color="gray.600">
            {step === 'signup'
              ? 'Join ListSpace PH and start managing your properties'
              : `We sent a confirmation code to ${email}`}
          </Text>
        </VStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {step === 'signup' ? (
          <Box w="full">
            <form onSubmit={signUpForm.handleSubmit(onSignUp)}>
              <Stack spacing={4}>
                <FormControl isInvalid={!!signUpForm.formState.errors.name}>
                  <FormLabel>Full Name</FormLabel>
                  <Input
                    {...signUpForm.register('name')}
                    placeholder="Enter your full name"
                  />
                  {signUpForm.formState.errors.name && (
                    <Text color="red.500" fontSize="sm">
                      {signUpForm.formState.errors.name.message}
                    </Text>
                  )}
                </FormControl>

                <FormControl isInvalid={!!signUpForm.formState.errors.email}>
                  <FormLabel>Email</FormLabel>
                  <Input
                    {...signUpForm.register('email')}
                    type="email"
                    placeholder="Enter your email"
                  />
                  {signUpForm.formState.errors.email && (
                    <Text color="red.500" fontSize="sm">
                      {signUpForm.formState.errors.email.message}
                    </Text>
                  )}
                </FormControl>

                <FormControl isInvalid={!!signUpForm.formState.errors.password}>
                  <FormLabel>Password</FormLabel>
                  <Input
                    {...signUpForm.register('password')}
                    type="password"
                    placeholder="Enter your password"
                  />
                  {signUpForm.formState.errors.password && (
                    <Text color="red.500" fontSize="sm">
                      {signUpForm.formState.errors.password.message}
                    </Text>
                  )}
                </FormControl>

                <FormControl isInvalid={!!signUpForm.formState.errors.confirmPassword}>
                  <FormLabel>Confirm Password</FormLabel>
                  <Input
                    {...signUpForm.register('confirmPassword')}
                    type="password"
                    placeholder="Confirm your password"
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <Text color="red.500" fontSize="sm">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </Text>
                  )}
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="primary"
                  size="lg"
                  isLoading={isLoading}
                  loadingText="Creating Account..."
                >
                  Create Account
                </Button>
              </Stack>
            </form>
          </Box>
        ) : (
          <Box w="full">
            <form onSubmit={confirmForm.handleSubmit(onConfirm)}>
              <Stack spacing={4}>
                <FormControl isInvalid={!!confirmForm.formState.errors.confirmationCode}>
                  <FormLabel>Confirmation Code</FormLabel>
                  <Input
                    {...confirmForm.register('confirmationCode')}
                    placeholder="Enter 6-digit code"
                    textAlign="center"
                    fontSize="lg"
                    letterSpacing="wider"
                  />
                  {confirmForm.formState.errors.confirmationCode && (
                    <Text color="red.500" fontSize="sm">
                      {confirmForm.formState.errors.confirmationCode.message}
                    </Text>
                  )}
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="primary"
                  size="lg"
                  isLoading={isLoading}
                  loadingText="Confirming..."
                >
                  Confirm Account
                </Button>
              </Stack>
            </form>
          </Box>
        )}

        <Text textAlign="center">
          Already have an account?{' '}
          <ChakraLink as={Link} href="/auth/signin" color="primary.500">
            Sign in here
          </ChakraLink>
        </Text>
      </VStack>
    </Container>
  )
}
