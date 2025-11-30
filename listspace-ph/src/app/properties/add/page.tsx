'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, VStack, Heading, useToast } from '@chakra-ui/react';
import { PropertyForm } from '@/components/PropertyForm';
import { ArrowBackIcon } from '@chakra-ui/icons';

export default function AddPropertyPage() {
  const router = useRouter();
  const toast = useToast();

  const handleFormSuccess = (property: any) => {
    toast({
      title: 'Property created',
      description: 'Property has been created successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    router.push('/properties/manage.html');
  };

  const handleCancel = () => {
    router.push('/properties.html');
  };

  return (
    <Box minH="calc(100vh - 70px)" p={6}>
      <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
        <PropertyForm
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      </VStack>
    </Box>
  );
}
