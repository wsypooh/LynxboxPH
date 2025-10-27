'use client';

import { Box, Container } from '@chakra-ui/react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're done loading and there's no user
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Box>Loading...</Box>
      </Box>
    );
  }

  // If there's no user after loading is complete, don't render anything
  // The router will handle the redirect in the effect above
  if (!user) {
    return null;
  }

  // In dashboard layout, we don't need to render Navigation here
  // as it's already handled in the root layout
  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }}>
      <Box as="main" ml={{ base: 0, md: 60 }} p="4">
        <Container maxW="container.xl" py={8}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
