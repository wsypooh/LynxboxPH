'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, FormErrorMessage, Input, Button, VStack, Textarea, Select, Progress, Text,
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import { validateDocumentFile } from '@/lib/utils';
import { documentService } from '@/services/documentService';
import { Document, DocumentCategory, DocumentParentType, DOCUMENT_CATEGORY_LABELS } from '@/features/documents/types';

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
  parentType: DocumentParentType;
  parentId: string;
  contractId?: string;
  defaultCategory?: DocumentCategory;
  onUploaded: (document: Document) => void;
}

export function DocumentUploadModal({ isOpen, onClose, parentType, parentId, contractId, defaultCategory, onUploaded }: Props) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: defaultCategory ?? (contractId ? 'lease_contract' : 'other'),
      expiryDate: '',
      notes: '',
    },
  });

  const handleClose = () => {
    setFile(null);
    setFileError(undefined);
    setProgress(0);
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError(undefined);
      return;
    }
    const validation = validateDocumentFile(selected);
    if (!validation.isValid) {
      setFile(null);
      setFileError(validation.error);
      return;
    }
    setFile(selected);
    setFileError(undefined);
  };

  const onSubmit = async (data: FormValues) => {
    if (!file) {
      setFileError('Please select a file to upload');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const { documentId, uploadUrl, key } = await documentService.getUploadUrl(parentType, parentId, file.name, file.type);
      await documentService.uploadFile(uploadUrl, file, setProgress);
      const document = await documentService.confirmUpload({
        id: documentId,
        parentType,
        parentId,
        contractId,
        category: data.category,
        fileName: file.name,
        s3Key: key,
        mimeType: file.type,
        fileSize: file.size,
        expiryDate: data.expiryDate || undefined,
        notes: data.notes || undefined,
      });
      onUploaded(document);
      toast({ title: 'Document uploaded', status: 'success' });
      handleClose();
    } catch (err: any) {
      toast({ title: err.message || 'Error uploading document', status: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Upload Document</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!fileError}>
                <FormLabel>File</FormLabel>
                <Input type="file" p={1} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                {file && <Text fontSize="xs" color="gray.500" mt={1}>{file.name}</Text>}
                <FormErrorMessage>{fileError}</FormErrorMessage>
              </FormControl>
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
              {uploading && <Progress value={progress} w="100%" size="sm" colorScheme="blue" borderRadius="md" />}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>Cancel</Button>
            <Button type="submit" colorScheme="blue" isLoading={uploading}>Upload</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
