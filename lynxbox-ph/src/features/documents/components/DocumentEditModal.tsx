'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, FormErrorMessage, Input, Button, VStack, Textarea, Select, useToast,
} from '@chakra-ui/react';
import { documentService } from '@/services/documentService';
import { Document, DocumentCategory, DOCUMENT_CATEGORY_LABELS } from '@/features/documents/types';

const CATEGORIES: DocumentCategory[] = ['sec_certificate', 'business_permit', 'lease_contract', 'government_id', 'other'];

const schema = z.object({
  category: z.enum(['sec_certificate', 'business_permit', 'lease_contract', 'government_id', 'other']),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  doc: Document | null;
  onUpdated: (document: Document) => void;
}

export function DocumentEditModal({ isOpen, onClose, doc, onUpdated }: Props) {
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'other', expiryDate: '', notes: '' },
  });

  useEffect(() => {
    if (doc) {
      reset({
        category: doc.category,
        expiryDate: doc.expiryDate ?? '',
        notes: doc.notes ?? '',
      });
    }
  }, [doc, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!doc) return;
    try {
      const updated = await documentService.updateDocument(doc.id, {
        category: data.category,
        expiryDate: data.expiryDate || undefined,
        notes: data.notes || undefined,
      });
      onUpdated(updated);
      toast({ title: 'Document updated', status: 'success' });
      onClose();
    } catch (err: any) {
      toast({ title: err.message || 'Error updating document', status: 'error' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Document</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.category}>
                <FormLabel>Category</FormLabel>
                <Select {...register('category')}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
              </FormControl>
              <FormControl>
                <FormLabel>Expiry Date (optional)</FormLabel>
                <Input type="date" {...register('expiryDate')} />
              </FormControl>
              <FormControl>
                <FormLabel>Notes (optional)</FormLabel>
                <Textarea {...register('notes')} rows={2} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button type="submit" colorScheme="blue" isLoading={isSubmitting}>Save</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
