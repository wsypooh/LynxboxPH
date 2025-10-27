'use client'

import { Box, Container, Flex, Text, Button, HStack, IconButton, useDisclosure, Stack, useColorModeValue, Icon } from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons'
import Link from 'next/link'
import { useAuth } from '@/features/auth/AuthContext'

interface NavItem {
  label: string
  href: string
  isPrivate?: boolean
}

const NAV_ITEMS: Array<NavItem> = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Properties',
    href: '/properties',
  },
  {
    label: 'Pricing',
    href: '/#pricing',
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
    isPrivate: true,
  },
]

export function Navigation() {
  const { isOpen, onToggle } = useDisclosure()
  const { user, signOut } = useAuth()

  return (
    <Box as="nav" position="fixed" w="100%" zIndex={1000} bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(10px)">
      <Container maxW="container.xl" px={[4, 6, 8]} py={4}>
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          {/* Logo */}
          <Flex alignItems={'center'}>
            <Link href="/">
              <Text fontSize="xl" fontWeight="bold" color="white">
                ListSpace PH
              </Text>
            </Link>
          </Flex>

          {/* Desktop Navigation */}
          <HStack as={'nav'} spacing={8} display={{ base: 'none', md: 'flex' }}>
            {NAV_ITEMS.map((item) => {
              if (item.isPrivate && !user) return null
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="ghost" color="white" _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}>
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </HStack>

          {/* Auth Buttons - Desktop */}
          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            {user ? (
              <>
                <Link href="/dashboard/profile">
                  <Button variant="outline" colorScheme="white" size="sm">
                    My Account
                  </Button>
                </Link>
                <Button 
                  variant="solid" 
                  colorScheme="blue" 
                  size="sm"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button 
                    variant="solid" 
                    bg="white" 
                    color="gray.800" 
                    size="sm"
                    _hover={{
                      bg: 'gray.100',
                      transform: 'translateY(-1px)',
                      boxShadow: 'md'
                    }}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="solid" colorScheme="blue" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </HStack>

          {/* Mobile menu button */}
          <IconButton
            size={'md'}
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label={'Open Menu'}
            display={{ md: 'none' }}
            onClick={onToggle}
            color="white"
            variant="ghost"
          />
        </Flex>
      </Container>

      {/* Mobile Navigation */}
      {isOpen ? (
        <Box pb={4} display={{ md: 'none' }} bg="rgba(0, 0, 0, 0.95)">
          <Stack as={'nav'} spacing={1} px={4}>
            {NAV_ITEMS.map((item) => {
              if (item.isPrivate && !user) return null
              return (
                <Link key={item.href} href={item.href} onClick={onToggle}>
                  <Button
                    w="full"
                    justifyContent="flex-start"
                    variant="ghost"
                    color="white"
                    _hover={{
                      bg: 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {item.label}
                  </Button>
                </Link>
              )
            })}
            
            {user ? (
              <>
                <Link href="/dashboard/profile" onClick={onToggle}>
                  <Button w="full" justifyContent="flex-start" variant="ghost" color="white">
                    My Account
                  </Button>
                </Link>
                <Button 
                  w="full" 
                  justifyContent="flex-start" 
                  variant="ghost" 
                  color="white"
                  onClick={() => {
                    signOut()
                    onToggle()
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" onClick={onToggle}>
                  <Button 
                    w="full" 
                    justifyContent="center" 
                    variant="solid" 
                    bg="white" 
                    color="gray.800"
                    _hover={{
                      bg: 'gray.100',
                      transform: 'translateY(-1px)',
                      boxShadow: 'md'
                    }}
                    mt={2}
                    mb={2}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={onToggle}>
                  <Button w="full" justifyContent="flex-start" variant="ghost" color="white">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
}
