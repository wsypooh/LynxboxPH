'use client';

import { useState } from 'react';
import {
  Box,
  Select,
  Button,
  HStack,
  Spinner,
  useToast,
  Badge,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { propertyService } from '@/services/propertyService';
import { Property, PropertyStatus } from '@/services/propertyService';

interface PropertyStatusUpdaterProps {
  property: Property;
  onStatusUpdate?: (updatedProperty: Property) => void;
  compact?: boolean;
}

const statusOptions: { value: PropertyStatus; label: string; colorScheme: string }[] = [
  { value: 'available', label: 'Available', colorScheme: 'green' },
  { value: 'rented', label: 'Rented', colorScheme: 'blue' },
  { value: 'sold', label: 'Sold', colorScheme: 'red' },
  { value: 'maintenance', label: 'Under Maintenance', colorScheme: 'orange' },
];

export function PropertyStatusUpdater({ property, onStatusUpdate, compact = false }: PropertyStatusUpdaterProps) {
  const [status, setStatus] = useState<PropertyStatus>(property.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();

  const handleStatusUpdate = async () => {
    if (status === property.status) return; // No change needed

    try {
      setIsUpdating(true);
      const updatedProperty = await propertyService.updateProperty(property.id, {
        status
      });

      toast({
        title: 'Status Updated',
        description: `Property status changed to ${status}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onStatusUpdate?.(updatedProperty);
    } catch (error) {
      console.error('Failed to update property status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update property status. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatusOption = statusOptions.find(option => option.value === property.status);
  const selectedStatusOption = statusOptions.find(option => option.value === status);

  return (
    <Box>
      {compact ? (
        <HStack spacing={2} align="center">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as PropertyStatus)}
            size="xs"
            isDisabled={isUpdating}
            minW="100px"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Button
            size="xs"
            onClick={handleStatusUpdate}
            isDisabled={status === property.status || isUpdating}
            colorScheme="blue"
            minW="50px"
            px={2}
          >
            {isUpdating ? <Spinner size="xs" /> : 'Go'}
          </Button>
        </HStack>
      ) : (
        <HStack spacing={4} align="center">
          <FormControl display="flex" alignItems="center" minW="200px">
            <FormLabel fontSize="sm" mb={0} mr={2}>
              Status:
            </FormLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as PropertyStatus)}
              size="sm"
              isDisabled={isUpdating}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>

          <Button
            size="sm"
            onClick={handleStatusUpdate}
            isDisabled={status === property.status || isUpdating}
            colorScheme="blue"
            minW="80px"
          >
            {isUpdating ? <Spinner size="xs" /> : 'Update'}
          </Button>

          <Badge colorScheme={selectedStatusOption?.colorScheme || 'gray'}>
            {selectedStatusOption?.label || status}
          </Badge>
        </HStack>
      )}
    </Box>
  );
}
