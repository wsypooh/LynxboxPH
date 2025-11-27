// In forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth'
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
  useColorModeValue,
  AlertTitle,
  AlertDescription,
  Flex,
  Icon
} from '@chakra-ui/react'
import { CheckIcon } from '@chakra-ui/icons'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await resetPassword({ username: email })
      setIsCodeSent(true)
    } catch (err: any) {
      console.error('Error requesting password reset:', err)
      setError(err.message || 'An error occurred while requesting password reset')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: verificationCode,
        newPassword
      })
      setIsPasswordReset(true)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      setError(err.message || 'An error occurred while resetting your password')
    } finally {
      setIsLoading(false)
    }
  }

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  if (isPasswordReset) {
    return (
      <Container maxW="md" py={12}>
        <Box
          bg={bgColor}
          py={8}
          px={{ base: 4, md: 10 }}
          shadow="base"
          rounded="lg"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <VStack spacing={6} textAlign="center">
            <Flex
              w={12}
              h={12}
              align="center"
              justify="center"
              rounded="full"
              bg="green.100"
            >
              <Icon as={CheckIcon} color="green.500" w={6} h={6} />
            </Flex>
            <Heading as="h2" size="lg">
              Password Reset Successful
            </Heading>
            <Text color="gray.600">
              Your password has been successfully updated. You can now sign in with your new password.
            </Text>
            <Button
              as={Link}
              href="/auth/signin"
              colorScheme="blue"
              width="full"
              mt={4}
            >
              Back to Sign In
            </Button>
          </VStack>
        </Box>
      </Container>
    )
  }

  if (isCodeSent) {
    return (
      <Container maxW="md" py={12}>
        <Box
          bg={bgColor}
          py={8}
          px={{ base: 4, md: 10 }}
          shadow="base"
          rounded="lg"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Box textAlign="center" mb={8}>
            <Heading as="h2" size="lg" mb={2}>
              Enter Verification Code
            </Heading>
            <Text color="gray.600">
              We've sent a verification code to <strong>{email}</strong>. Please enter it below along with your new password.
            </Text>
          </Box>

          {error && (
            <Alert status="error" mb={6} rounded="md">
              <AlertIcon />
              <Box>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Box>
            </Alert>
          )}

          <form onSubmit={handleResetPassword}>
            <Stack spacing={6}>
              <FormControl id="verificationCode" isRequired>
                <FormLabel>Verification Code</FormLabel>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                />
              </FormControl>

              <FormControl id="newPassword" isRequired>
                <FormLabel>New Password</FormLabel>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                width="full"
                isLoading={isLoading}
                loadingText="Resetting..."
              >
                Reset Password
              </Button>
            </Stack>
          </form>

          <Box mt={6} textAlign="center">
            <Text>
              Didn't receive a code?{' '}
              <ChakraLink as="button" onClick={() => setIsCodeSent(false)} color="blue.500">
                Resend code
              </ChakraLink>
            </Text>
          </Box>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="md" py={12}>
      <Box
        bg={bgColor}
        py={8}
        px={{ base: 4, md: 10 }}
        shadow="base"
        rounded="lg"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Box textAlign="center" mb={8}>
          <Heading as="h2" size="lg" mb={2}>
            Forgot your password?
          </Heading>
          <Text color="gray.600">
            Enter your email address and we'll send you a verification code to reset your password.
          </Text>
        </Box>

        {error && (
          <Alert status="error" mb={6} rounded="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        )}

        <form onSubmit={handleSendCode}>
          <Stack spacing={6}>
            <FormControl id="email" isRequired>
              <FormLabel>Email address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              loadingText="Sending..."
            >
              Send Verification Code
            </Button>
          </Stack>
        </form>

        <Box mt={6} textAlign="center">
          <Text>
            Remember your password?{' '}
            <ChakraLink as={Link} href="/auth/signin" color="blue.500">
              Sign in here
            </ChakraLink>
          </Text>
        </Box>
      </Box>
    </Container>
  )
}