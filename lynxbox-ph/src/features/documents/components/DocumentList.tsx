'use client';
import { useState } from 'react';
import {
  Table, TableContainer, Thead, Tbody, Tr, Th, Td, Badge, IconButton, HStack, Text, Tooltip, useToast, useDisclosure,
} from '@chakra-ui/react';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { documentService } from '@/services/documentService';
import { Document, DOCUMENT_CATEGORY_LABELS } from '@/features/documents/types';
import { DocumentEditModal } from '@/features/documents/components/DocumentEditModal';
import { useAccount } from '@/features/account/AccountContext';

function expiryBadge(expiryDate?: string) {
  if (!expiryDate) return null;
  const days = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return <Badge colorScheme="red">Expired</Badge>;
  if (days <= 30) return <Badge colorScheme="orange">Expiring soon</Badge>;
  return <Badge colorScheme="green">Valid</Badge>;
}

interface Props {
  documents: Document[];
  onDelete: (id: string) => void;
  onUpdate: (document: Document) => void;
  contractLabel?: (contractId: string) => string | undefined;
}

export function DocumentList({ documents, onDelete, onUpdate, contractLabel }: Props) {
  const { canWrite, canDestroy } = useAccount();
  const toast = useToast();
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const { isOpen: editOpen, onOpen: openEdit, onClose: closeEdit } = useDisclosure();

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    openEdit();
  };

  const handleView = async (id: string) => {
    try {
      const url = await documentService.getViewUrl(id);
      window.open(url, '_blank');
    } catch (err: any) {
      toast({ title: err.message || 'Error opening document', status: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? The file will be kept for audit purposes.')) return;
    try {
      await documentService.deleteDocument(id);
      onDelete(id);
      toast({ title: 'Document deleted', status: 'info' });
    } catch (err: any) {
      toast({ title: err.message || 'Error deleting document', status: 'error' });
    }
  };

  if (documents.length === 0) {
    return <Text color="gray.500" fontSize="sm">No documents uploaded yet.</Text>;
  }

  return (
    <>
    <TableContainer overflowX="auto">
    <Table size="sm">
      <Thead>
        <Tr>
          <Th minW="240px">File</Th>
          <Th>Category</Th>
          <Th whiteSpace="nowrap">Uploaded</Th>
          <Th>Expiry</Th>
          <Th whiteSpace="nowrap">Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {documents.map(doc => (
          <Tr key={doc.id}>
            <Td whiteSpace="normal" maxW="360px">
              <Text fontWeight="medium" wordBreak="break-word">{doc.fileName}</Text>
              {doc.contractId && contractLabel?.(doc.contractId) && (
                <Text fontSize="xs" color="gray.500">{contractLabel(doc.contractId)}</Text>
              )}
              {doc.notes && <Text fontSize="xs" color="gray.500">{doc.notes}</Text>}
            </Td>
            <Td whiteSpace="nowrap"><Badge>{DOCUMENT_CATEGORY_LABELS[doc.category]}</Badge></Td>
            <Td whiteSpace="nowrap">{new Date(doc.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</Td>
            <Td whiteSpace="nowrap">{expiryBadge(doc.expiryDate)}</Td>
            <Td whiteSpace="nowrap">
              <HStack spacing={1}>
                <Tooltip label="View">
                  <IconButton aria-label="View document" icon={<FiEye />} size="xs" variant="outline" onClick={() => handleView(doc.id)} />
                </Tooltip>
                {canWrite && (
                  <Tooltip label="Edit">
                    <IconButton aria-label="Edit document" icon={<FiEdit2 />} size="xs" variant="outline" onClick={() => handleEdit(doc)} />
                  </Tooltip>
                )}
                {canDestroy && (
                  <Tooltip label="Delete">
                    <IconButton aria-label="Delete document" icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDelete(doc.id)} />
                  </Tooltip>
                )}
              </HStack>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
    </TableContainer>
    <DocumentEditModal
      isOpen={editOpen}
      onClose={closeEdit}
      doc={editingDoc}
      onUpdated={(updated) => { onUpdate(updated); closeEdit(); }}
    />
    </>
  );
}
