'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box, Container, Heading, Text, VStack, FormControl, FormLabel, FormErrorMessage,
  Input, Textarea, Button, useToast,
} from '@chakra-ui/react'
import { contactService } from '@/services/contactService'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
})

type FormValues = z.infer<typeof schema>

export default function ContactPage() {
  const toast = useToast()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await contactService.submit(data)
      toast({ title: 'Message sent', description: "We'll get back to you soon.", status: 'success' })
      reset()
    } catch (err: any) {
      toast({ title: 'Failed to send message', description: err?.message || 'Please try again later.', status: 'error' })
    }
  }

  return (
    <Box bg="gray.50" py={20} as="main" minH="100vh">
      <Container maxW="container.md">
        <VStack spacing={8} align="stretch">
          <VStack spacing={3} textAlign="center">
            <Heading size="xl">Contact Us</Heading>
            <Text fontSize="lg" color="gray.600">
              Have a question or need support? Send us a message and we&apos;ll get back to you.
            </Text>
          </VStack>

          <Box bg="white" p={8} borderRadius="lg" boxShadow="sm">
            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={4} align="stretch">
                <FormControl isInvalid={!!errors.name}>
                  <FormLabel>Name</FormLabel>
                  <Input {...register('name')} placeholder="Your name" />
                  <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.email}>
                  <FormLabel>Email</FormLabel>
                  <Input {...register('email')} type="email" placeholder="you@example.com" />
                  <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.subject}>
                  <FormLabel>Subject (optional)</FormLabel>
                  <Input {...register('subject')} placeholder="What's this about?" />
                  <FormErrorMessage>{errors.subject?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.message}>
                  <FormLabel>Message</FormLabel>
                  <Textarea {...register('message')} placeholder="How can we help?" rows={6} />
                  <FormErrorMessage>{errors.message?.message}</FormErrorMessage>
                </FormControl>

                <Button type="submit" colorScheme="blue" size="lg" isLoading={isSubmitting} alignSelf="flex-start">
                  Send Message
                </Button>
              </VStack>
            </form>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
