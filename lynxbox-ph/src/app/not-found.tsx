'use client'

import { Box, Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Box as="main" py={24}>
      <Container maxW="container.md">
        <VStack spacing={6} textAlign="center">
          <Text fontSize="6xl" fontWeight="bold" color="blue.500">404</Text>
          <Heading size="lg">Page not found</Heading>
          <Text color="gray.600">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </Text>
          <HStack spacing={4}>
            <Button as={Link} href="/" colorScheme="blue">Go to homepage</Button>
            <Button as={Link} href="/properties" variant="outline">Browse properties</Button>
            <Button as={Link} href="/help" variant="outline">Help</Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
