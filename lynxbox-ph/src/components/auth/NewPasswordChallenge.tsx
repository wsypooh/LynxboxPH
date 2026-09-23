'use client'

import { useState } from 'react'
import { confirmSignIn, type ConfirmSignInInput } from 'aws-amplify/auth'
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, Alert, AlertIcon } from '@chakra-ui/react'

type NewPasswordChallengeProps = {
  onSuccess: () => void
  onBack: () => void
}

export default function NewPasswordChallenge({ onSuccess, onBack }: NewPasswordChallengeProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await confirmSignIn({
        challengeResponse: newPassword
      } as ConfirmSignInInput)

      onSuccess()
    } catch (err: any) {
      console.error('Error setting new password:', err)
      setError(err.message || 'Failed to set new password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box w="full" maxW="md" mx="auto" p={6} borderWidth={1} borderRadius="md" boxShadow="sm">
      <VStack spacing={6} align="stretch">
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">Set a New Password</Heading>
          <Text color="gray.600">
            You&apos;re signing in with a temporary password. Choose a new password to continue.
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
              <FormLabel>New Password</FormLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Confirm New Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
              loadingText="Setting password..."
              isDisabled={!newPassword || !confirmPassword}
            >
              Set Password and Sign In
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
