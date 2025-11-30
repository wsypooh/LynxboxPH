'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  useToast,
} from '@chakra-ui/react';
import { Property, propertyService } from '@/services/propertyService';
import { DashboardPropertyList } from '@/components/DashboardPropertyList';
import { PropertyForm } from '@/components/PropertyForm';
import { PropertyDetail } from '@/components/PropertyDetail';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';

type View = 'list' | 'detail' | 'add' | 'edit';

export default function PropertyManagePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const toast = useToast();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setCurrentView('detail');
  };

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setCurrentView('edit');
  };

  const handleDeleteProperty = (property: Property) => {
    // Refresh the list after deletion
    setRefreshTrigger(prev => prev + 1);
    
    // Show success toast
    toast({
      title: 'Property deleted',
      description: 'Property has been deleted successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    // Redirect back to list view since the property no longer exists
    setCurrentView('list');
    setSelectedProperty(null);
  };

  const handleAddNew = () => {
    setSelectedProperty(null);
    setCurrentView('add');
  };

  const handleFormSuccess = (property: Property) => {
    if (!property) {
      console.error('Property is undefined in handleFormSuccess');
      toast({
        title: 'Error',
        description: 'Property update failed - no data returned',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setCurrentView('list');
      setSelectedProperty(null);
      return;
    }
    
    setRefreshTrigger(prev => prev + 1);
    setSelectedProperty(property);
    setCurrentView('detail');
  };

  const handleCancel = () => {
    setCurrentView('list');
    setSelectedProperty(null);
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedProperty(null);
  };

  if (isLoading) {
    return (
      <Box minH="calc(100vh - 70px)" p={6}>
        <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
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
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            {currentView !== 'list' && (
              <Button
                leftIcon={<ArrowBackIcon />}
                variant="outline"
                onClick={handleBack}
              >
                Back
              </Button>
            )}
            <Heading size="lg">
              {currentView === 'list' && 'Property Management'}
              {currentView === 'detail' && 'Property Details'}
              {currentView === 'add' && 'Add New Property'}
              {currentView === 'edit' && 'Edit Property'}
            </Heading>
          </HStack>
        </HStack>

        {/* Content */}
        {currentView === 'list' && (
          <DashboardPropertyList
            onView={handleViewProperty}
            onEdit={handleEditProperty}
            onDelete={handleDeleteProperty}
            onAddNew={handleAddNew}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'detail' && selectedProperty && (
          <PropertyDetail
            propertyId={selectedProperty.id}
            onBack={handleBack}
            onEdit={handleEditProperty}
            onDelete={handleDeleteProperty}
          />
        )}

        {currentView === 'add' && (
          <PropertyForm
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        )}

        {currentView === 'edit' && selectedProperty && (
          <PropertyForm
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
            initialData={selectedProperty}
            isEditing={true}
            propertyId={selectedProperty.id}
          />
        )}
      </VStack>
    </Box>
  );
}
