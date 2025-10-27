'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  HStack,
  useClipboard,
  Tooltip,
  Switch,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Link,
  Center,
  Image,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/features/auth/AuthContext';

export default function TwoFactorAuth() {
  const { 
    user,
    setupTOTP, 
    verifyTOTP, 
    getCurrentMFAPreference, 
    setMFAPreference 
  } = useAuth();
  
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [mfaPreference, setMfaPreference] = useState<'NOMFA' | 'TOTP'>('NOMFA');
  const [setupDetails, setSetupDetails] = useState<{
    sharedSecret: string;
    getSetupUri: (appName: string, accountName: string) => string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'complete'>('initial');
  
  const { hasCopied, onCopy } = useClipboard(setupDetails?.sharedSecret || '');
  
  // Check current MFA preference on mount
  useEffect(() => {
    const checkMFAPreference = async () => {
      try {
        const preference = await getCurrentMFAPreference();
        if (preference === 'TOTP' || preference === 'NOMFA') {
          setMfaPreference(preference);
          if (preference === 'TOTP') {
            setStep('complete');
          }
        }
      } catch (error) {
        console.error('Error checking MFA preference:', error);
      }
    };
    
    checkMFAPreference();
  }, [getCurrentMFAPreference]);

  const handleSetupClick = async () => {
    setIsLoading(true);
    try {
      const result = await setupTOTP();
      
      if (result.success && result.setupDetails) {
        setSetupDetails(result.setupDetails);
        setStep('setup');
      } else {
        throw new Error(result.error || 'Failed to set up TOTP');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set up TOTP',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyTOTP(verificationCode);
      
      if (result.success) {
        // Enable TOTP as preferred MFA method
        const prefResult = await setMFAPreference('TOTP');
        
        if (prefResult.success) {
          setMfaPreference('TOTP');
          setStep('complete');
          
          toast({
            title: '2FA Enabled',
            description: 'Two-factor authentication has been enabled successfully',
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
        } else {
          throw new Error(prefResult.error || 'Failed to enable 2FA');
        }
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Failed to verify code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will reduce the security of your account.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await setMFAPreference('NOMFA');
      
      if (result.success) {
        setMfaPreference('NOMFA');
        setStep('initial');
        
        toast({
          title: '2FA Disabled',
          description: 'Two-factor authentication has been disabled',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disable 2FA',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInitialStep = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Two-Factor Authentication (2FA)</AlertTitle>
          <AlertDescription>
            Add an extra layer of security to your account by enabling two-factor authentication.
          </AlertDescription>
        </Box>
      </Alert>
      
      <Box>
        <Text mb={4}>
          When you enable 2FA, you&apos;ll need to enter a verification code from an authenticator app 
          (like Google Authenticator or Authy) every time you sign in.
        </Text>
        
        <Button 
          colorScheme="blue" 
          onClick={handleSetupClick}
          isLoading={isLoading}
          loadingText="Setting up..."
        >
          Set Up
        </Button>
      </Box>
    </VStack>
  );

  const renderSetupStep = () => {
    if (!setupDetails) return null;
    
    const userEmail = user?.attributes?.email || user?.username || 'user@example.com';
    const otpAuthUrl = setupDetails.getSetupUri('ListSpacePH', userEmail);
    
    return (
      <VStack spacing={6} align="stretch">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Set Up Authenticator App</AlertTitle>
            <AlertDescription>
              Scan the QR code below with your authenticator app or enter the secret key manually.
            </AlertDescription>
          </Box>
        </Alert>
        
        <Box textAlign="center">
          <Box 
            p={4} 
            borderWidth={1} 
            borderRadius="md" 
            display="inline-block" 
            bg="white" 
            borderColor="gray.200"
          >
            <QRCodeSVG value={otpAuthUrl} size={200} />
          </Box>
        </Box>
        
        <Box>
          <FormControl>
            <FormLabel>Or enter this code manually:</FormLabel>
            <HStack>
              <Input 
                value={setupDetails.sharedSecret} 
                isReadOnly 
                pr="4.5rem"
                fontFamily="monospace"
                letterSpacing="0.1em"
              />
              <Tooltip label={hasCopied ? 'Copied!' : 'Copy to clipboard'}> 
                <Button
                  onClick={onCopy}
                  leftIcon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                  colorScheme={hasCopied ? 'green' : 'gray'}
                >
                  {hasCopied ? 'Copied' : 'Copy'}
                </Button>
              </Tooltip>
            </HStack>
          </FormControl>
          
          <Text mt={2} color="gray.500" fontSize="sm">
            Enter this code in your authenticator app to set up 2FA.
          </Text>
        </Box>
        
        <Divider my={4} />
        
        <Box>
          <FormControl>
            <FormLabel>Enter the 6-digit code from your authenticator app:</FormLabel>
            <HStack>
              <Input 
                type="text" 
                placeholder="123456" 
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                fontFamily="monospace"
                letterSpacing="0.5em"
                textAlign="center"
                fontSize="xl"
                height="60px"
              />
            </HStack>
          </FormControl>
          
          <Button 
            mt={4} 
            colorScheme="blue" 
            onClick={handleVerify}
            isLoading={isVerifying}
            loadingText="Verifying..."
            isDisabled={verificationCode.length !== 6}
          >
            Verify and Enable
          </Button>
          
          <Button 
            mt={4} 
            ml={4}
            variant="outline" 
            onClick={() => setStep('initial')}
            isDisabled={isVerifying}
          >
            Cancel
          </Button>
        </Box>
      </VStack>
    );
  };

  const renderCompleteStep = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="success" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Two-Factor Authentication is Enabled</AlertTitle>
          <AlertDescription>
            Your account is now protected with two-factor authentication.
          </AlertDescription>
        </Box>
      </Alert>
      
      <Box mt={4}>
        <Text mb={4}>
          When you sign in, you&apos;ll be asked to enter a verification code from your authenticator app.
        </Text>
        
        <Button 
          colorScheme="red" 
          variant="outline"
          onClick={handleDisable2FA}
          isLoading={isLoading}
          loadingText="Disabling..."
        >
          Disable 2FA
        </Button>
        
        <Text mt={4} fontSize="sm" color="gray.500">
          Note: If you lose access to your authenticator app, you may lose access to your account.
          Make sure to keep your backup codes in a safe place.
        </Text>
      </Box>
    </VStack>
  );

  return (
    <Box>
      {step === 'initial' && renderInitialStep()}
      {step === 'setup' && renderSetupStep()}
      {step === 'complete' && renderCompleteStep()}
    </Box>
  );
}
