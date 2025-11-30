'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, VStack, Heading, HStack, Button, useToast } from '@chakra-ui/react';
import { PropertyForm } from '@/components/PropertyForm';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useAuth } from '@/features/auth/AuthContext';
import { route } from '@/utils/routing';

export default function AddPropertyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  const handleFormSuccess = (property: any) => {
    toast({
      title: 'Property created',
      description: 'Property has been created successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    router.push(route('/dashboard/properties/manage'));
  };

  const handleCancel = () => {
    router.push(route('/dashboard/properties/manage'));
  };

  const handleBack = () => {
    router.push(route('/dashboard/properties/manage'));
  };

  if (isLoading) {
    return (
      <Box minH="calc(100vh - 70px)" p={6}>
        <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
          <Heading size="lg">Loading...</Heading>
        </VStack>
      </Box>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <Box minH="calc(100vh - 70px)" p={6}>
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="outline"
              onClick={handleBack}
            >
              Back to Properties
            </Button>
            <Heading size="lg">Add New Property</Heading>
          </HStack>
        </HStack>

        {/* Form */}
        <PropertyForm
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      </VStack>
    </Box>
  );
}
