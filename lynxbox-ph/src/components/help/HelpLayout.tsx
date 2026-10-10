'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Box, Container, Flex, Heading, Input, Link as ChakraLink, ListItem, OrderedList, Table, Tbody, Td, Text, Th, Thead, Tr, UnorderedList, Image, Code, VStack,
} from '@chakra-ui/react'

export interface HelpNavItem {
  slug: string
  title: string
  summary: string
}

export function HelpLayout({ nav, activeSlug, title, body }: { nav: HelpNavItem[]; activeSlug?: string; title?: string; body?: string }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q ? nav.filter(n => `${n.title} ${n.summary}`.toLowerCase().includes(q)) : nav

  return (
    <Box as="main" bg="gray.50" pt={28} pb={16} minH="100vh">
      <Container maxW="container.xl">
        <Flex gap={10} direction={['column', 'column', 'row']}>
          <Box w={['100%', '100%', '260px']} flexShrink={0}>
            <Input placeholder="Search help..." bg="white" mb={4} value={query} onChange={e => setQuery(e.target.value)} />
            <VStack align="stretch" spacing={1}>
              <ChakraLink as={Link} href="/help" fontWeight="semibold" px={3} py={2}>All topics</ChakraLink>
              {filtered.map(n => (
                <ChakraLink
                  as={Link}
                  key={n.slug}
                  href={`/help/${n.slug}`}
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={n.slug === activeSlug ? 'primary.50' : undefined}
                  fontWeight={n.slug === activeSlug ? 'semibold' : 'normal'}
                >
                  {n.title}
                </ChakraLink>
              ))}
              {filtered.length === 0 && <Text color="gray.500" px={3}>No matching topics.</Text>}
              <ChakraLink as={Link} href="/contact" px={3} py={2} borderRadius="md" fontWeight="semibold" borderTopWidth="1px" mt={2}>
                Contact Us
              </ChakraLink>
            </VStack>
          </Box>

          <Box flex="1" bg="white" p={[5, 8]} borderRadius="lg" shadow="sm" minW={0}>
            {body === undefined ? (
              <>
                <Heading size="xl" mb={2}>Help Center</Heading>
                <Text color="gray.600" mb={8}>Guides for managing buildings, tenants, invoices, payments, and listings.</Text>
                <VStack align="stretch" spacing={4}>
                  {filtered.map(n => (
                    <Box key={n.slug} as={Link} href={`/help/${n.slug}`} p={4} borderWidth="1px" borderRadius="md" _hover={{ bg: 'gray.50' }}>
                      <Heading size="md">{n.title}</Heading>
                      <Text color="gray.600" mt={1}>{n.summary}</Text>
                    </Box>
                  ))}
                  <Box as={Link} href="/contact" p={4} borderWidth="1px" borderRadius="md" _hover={{ bg: 'gray.50' }}>
                    <Heading size="md">Contact Us</Heading>
                    <Text color="gray.600" mt={1}>Can&apos;t find what you need? Send us a message and we&apos;ll get back to you.</Text>
                  </Box>
                </VStack>
              </>
            ) : (
              <>
                <Heading size="xl" mb={6}>{title}</Heading>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => <Heading as="h2" size="lg" mt={8} mb={3}>{children}</Heading>,
                    h3: ({ children }) => <Heading as="h3" size="md" mt={6} mb={2}>{children}</Heading>,
                    p: ({ children }) => <Text mb={4} lineHeight="tall">{children}</Text>,
                    ul: ({ children }) => <UnorderedList mb={4} spacing={1} ml={6}>{children}</UnorderedList>,
                    ol: ({ children }) => <OrderedList mb={4} spacing={1} ml={6}>{children}</OrderedList>,
                    li: ({ children }) => <ListItem>{children}</ListItem>,
                    a: ({ href, children }) => <ChakraLink href={href} color="primary.600" textDecoration="underline">{children}</ChakraLink>,
                    code: ({ children }) => <Code>{children}</Code>,
                    img: ({ src, alt }) => <Image src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} borderWidth="1px" borderRadius="md" my={4} maxW="100%" />,
                    table: ({ children }) => <Box overflowX="auto" mb={4}><Table size="sm">{children}</Table></Box>,
                    thead: ({ children }) => <Thead>{children}</Thead>,
                    tbody: ({ children }) => <Tbody>{children}</Tbody>,
                    tr: ({ children }) => <Tr>{children}</Tr>,
                    th: ({ children }) => <Th>{children}</Th>,
                    td: ({ children }) => <Td>{children}</Td>,
                  }}
                >
                  {body}
                </ReactMarkdown>
              </>
            )}
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}
