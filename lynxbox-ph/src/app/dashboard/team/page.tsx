'use client';
import { useState, useEffect } from 'react';
import {
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, IconButton,
  useToast, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Select, Spinner, HStack,
} from '@chakra-ui/react';
import { FiTrash2, FiUserPlus } from 'react-icons/fi';
import { useAccount } from '@/features/account/AccountContext';
import { accountService } from '@/services/accountService';
import { AccountMember, Role } from '@/features/account/types';

export default function TeamPage() {
  const { canManageMembers, isLoading: accountLoading } = useAccount();
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('staff');
  const [isInviting, setIsInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await accountService.listMembers();
      setMembers(data);
    } catch (err: any) {
      toast({ title: 'Failed to load members', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await accountService.inviteMember({ email: inviteEmail, role: inviteRole as Exclude<Role, 'owner'> });
      toast({ title: 'Invitation sent', status: 'success' });
      setInviteEmail('');
      setInviteRole('staff');
      onClose();
      load();
    } catch (err: any) {
      toast({ title: 'Failed to invite', description: err.message, status: 'error' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (sub: string, role: Role) => {
    try {
      await accountService.updateMemberRole(sub, role);
      toast({ title: 'Role updated', status: 'success' });
      load();
    } catch (err: any) {
      toast({ title: 'Failed to update role', description: err.message, status: 'error' });
    }
  };

  const handleRemove = async (sub: string) => {
    if (!confirm('Remove this member? They will lose access to this account.')) return;
    try {
      await accountService.removeMember(sub);
      toast({ title: 'Member removed', status: 'info' });
      load();
    } catch (err: any) {
      toast({ title: 'Failed to remove member', description: err.message, status: 'error' });
    }
  };

  if (accountLoading || loading) {
    return (
      <Box p={8}>
        <Spinner />
      </Box>
    );
  }

  if (!canManageMembers) {
    return (
      <Box p={8}>
        <Text>Only the account owner can manage team members.</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>Team</Heading>
          <Text color="gray.500">Invite people to help manage this account.</Text>
        </Box>
        <Button colorScheme="blue" leftIcon={<FiUserPlus />} onClick={onOpen}>Invite Member</Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th></Th></Tr>
        </Thead>
        <Tbody>
          {members.map(m => (
            <Tr key={m.sub}>
              <Td>{m.email}</Td>
              <Td>
                {m.role === 'owner' ? (
                  <Badge colorScheme="purple">Owner</Badge>
                ) : (
                  <Select
                    size="sm"
                    width="140px"
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.sub, e.target.value as Role)}
                  >
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                )}
              </Td>
              <Td>
                <Badge colorScheme={m.status === 'active' ? 'green' : 'yellow'}>{m.status}</Badge>
              </Td>
              <Td>
                {m.role !== 'owner' && (
                  <IconButton
                    aria-label="Remove member"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleRemove(m.sub)}
                  />
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invite a Team Member</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Role</FormLabel>
              <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="viewer">Viewer</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleInvite} isLoading={isInviting} isDisabled={!inviteEmail}>
              Send Invite
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
