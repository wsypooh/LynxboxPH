'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, confirmSignIn, type ConfirmSignInInput } from 'aws-amplify/auth'
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, Alert, AlertIcon } from '@chakra-ui/react'

type MFAVerificationProps = {
  username: string
  onSuccess: () => void
  onBack: () => void
}

export default function MFAVerification({ username, onSuccess, onBack }: MFAVerificationProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    
    setIsLoading(true)
    setError('')

    try {
      // Submit the TOTP code
      await confirmSignIn({
        challengeResponse: code
      } as ConfirmSignInInput)
      
      // If we get here, verification was successful
      onSuccess()
    } catch (err: any) {
      console.error('Error verifying MFA code:', err)
      setError(err.message || 'Invalid verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box w="full" maxW="md" mx="auto" p={6} borderWidth={1} borderRadius="md" boxShadow="sm">
      <VStack spacing={6} align="stretch">
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">Enter Verification Code</Heading>
          <Text color="gray.600">
            Enter the 6-digit code from your authenticator app
          </Text>
        </VStack>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Verification Code</FormLabel>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                autoFocus
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              loadingText="Verifying..."
              isDisabled={!code || code.length !== 6}
            >
              Verify
            </Button>

            <Button
              variant="outline"
              width="full"
              onClick={onBack}
              isDisabled={isLoading}
            >
              Back to Sign In
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  )
}
