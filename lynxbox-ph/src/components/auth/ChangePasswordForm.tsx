'use client';

import { useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  VStack,
  useToast,
  Text,
  Box,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '@/features/auth/AuthContext';

export default function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await changePassword(formData.currentPassword, formData.newPassword);
      
      if (result.success) {
        toast({
          title: 'Password updated',
          description: 'Your password has been changed successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        throw new Error(result.error || 'Failed to change password');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%">
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={!!errors.currentPassword} isRequired>
          <FormLabel>Current Password</FormLabel>
          <InputGroup>
            <Input
              type={showCurrent ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={(e) => {
                setFormData({ ...formData, currentPassword: e.target.value });
                if (errors.currentPassword) {
                  setErrors({ ...errors, currentPassword: '' });
                }
              }}
              placeholder="Enter current password"
            />
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <ViewOffIcon /> : <ViewIcon />}
              </Button>
            </InputRightElement>
          </InputGroup>
          {errors.currentPassword && (
            <Text color="red.500" fontSize="sm" mt={1}>
              {errors.currentPassword}
            </Text>
          )}
        </FormControl>

        <FormControl isInvalid={!!errors.newPassword} isRequired>
          <FormLabel>New Password</FormLabel>
          <InputGroup>
            <Input
              type={showNew ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={(e) => {
                setFormData({ ...formData, newPassword: e.target.value });
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: '' });
                }
              }}
              placeholder="Enter new password"
            />
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => setShowNew(!showNew)}>
                {showNew ? <ViewOffIcon /> : <ViewIcon />}
              </Button>
            </InputRightElement>
          </InputGroup>
          {errors.newPassword ? (
            <Text color="red.500" fontSize="sm" mt={1}>
              {errors.newPassword}
            </Text>
          ) : (
            <Text color="gray.500" fontSize="xs" mt={1}>
              Must be at least 8 characters long
            </Text>
          )}
        </FormControl>

        <FormControl isInvalid={!!errors.confirmPassword} isRequired>
          <FormLabel>Confirm New Password</FormLabel>
          <InputGroup>
            <Input
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: '' });
                }
              }}
              placeholder="Confirm new password"
            />
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <ViewOffIcon /> : <ViewIcon />}
              </Button>
            </InputRightElement>
          </InputGroup>
          {errors.confirmPassword && (
            <Text color="red.500" fontSize="sm" mt={1}>
              {errors.confirmPassword}
            </Text>
          )}
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isLoading}
          loadingText="Updating..."
          mt={4}
        >
          Update Password
        </Button>
      </VStack>
    </Box>
  );
}
