'use client';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  VStack, HStack, Stack, FormControl, FormLabel, FormErrorMessage, Input,
  NumberInput, NumberInputField, Button, IconButton, Select, Switch, Heading,
  Divider, Box, Text, Tooltip, useDisclosure,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import { Building, Tenant } from '@/features/invoicing/types';
import { documentService } from '@/services/documentService';
import { Document } from '@/features/documents/types';
import { DocumentUploadModal } from '@/features/documents/components/DocumentUploadModal';
import { DocumentList } from '@/features/documents/components/DocumentList';

const contractSchema = z.object({
  id: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  rentAmount: z.number().min(0),
  deposit: z.number().min(0),
  notes: z.string().optional(),
});

const schema = z.object({
  tenantCode: z.string().optional(),
  buildingId: z.string().min(1, 'Building is required'),
  floor: z.string().min(1, 'Floor is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  area: z.number().min(0),
  lesseeName: z.string().min(1, 'Lessee name is required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().regex(/^[+\d][\d\s\-()\\.]{6,18}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  tin: z.string().optional(),
  defaultRent: z.number().min(0),
  vatEnabled: z.boolean(),
  withholdingTaxEnabled: z.boolean(),
  electricityMode: z.enum(['metered', 'direct']),
  waterMode: z.enum(['metered', 'fixed', 'direct']),
  defaultWaterRate: z.number().optional(),
  defaultFixedWater: z.number().optional(),
  defaultGuard: z.number().min(0).optional(),
  penaltyEnabled: z.boolean(),
  status: z.enum(['active', 'inactive']),
  contracts: z.array(contractSchema),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  buildings: Building[];
  defaultValues?: Partial<Tenant>;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TenantForm({ buildings, defaultValues, onSubmit, onCancel, isLoading }: Props) {
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantCode: defaultValues?.tenantCode || '',
      buildingId: defaultValues?.buildingId || '',
      floor: defaultValues?.floor || '',
      roomNumber: defaultValues?.roomNumber || '',
      area: defaultValues?.area ?? 0,
      lesseeName: defaultValues?.lesseeName || '',
      contactEmail: defaultValues?.contactEmail || '',
      contactPhone: defaultValues?.contactPhone || '',
      tin: defaultValues?.tin || '',
      defaultRent: defaultValues?.defaultRent ?? 0,
      vatEnabled: defaultValues?.vatEnabled ?? false,
      withholdingTaxEnabled: defaultValues?.withholdingTaxEnabled ?? false,
      electricityMode: defaultValues?.electricityMode ?? 'metered',
      waterMode: defaultValues?.waterMode ?? 'fixed',
      defaultWaterRate: defaultValues?.defaultWaterRate,
      defaultFixedWater: defaultValues?.defaultFixedWater,
      defaultGuard: defaultValues?.defaultGuard ?? 0,
      penaltyEnabled: defaultValues?.penaltyEnabled ?? true,
      status: defaultValues?.status ?? 'active',
      contracts: defaultValues?.contracts ?? [],
    },
  });

  // keyName avoids colliding RHF's internal row key with our own TenantContract.id field
  const { fields: contractFields, append: appendContract, remove: removeContract } = useFieldArray({ control, name: 'contracts', keyName: '_key' });
  const waterMode = watch('waterMode');

  const tenantId = defaultValues?.id;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadContractId, setUploadContractId] = useState<string | null>(null);
  const { isOpen: uploadOpen, onOpen: openUpload, onClose: closeUpload } = useDisclosure();

  useEffect(() => {
    if (!tenantId) return;
    documentService.listDocuments('TENANT', tenantId).then(setDocuments).catch(() => {});
  }, [tenantId]);

  const handleAttachClick = (contractId: string) => {
    setUploadContractId(contractId);
    openUpload();
  };

  const handleRemoveContract = (idx: number, contractId?: string) => {
    const attachedCount = contractId ? documents.filter(d => d.contractId === contractId).length : 0;
    const message = attachedCount > 0
      ? `Remove this contract? It has ${attachedCount} attached document(s) — they will stay in the tenant's Documents list but will no longer show which contract period they belong to.`
      : 'Remove this contract?';
    if (!confirm(message)) return;
    removeContract(idx);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={5} align="stretch">
        <Heading size="sm">Unit Information</Heading>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl isInvalid={!!errors.buildingId}>
            <FormLabel>Building</FormLabel>
            <Select {...register('buildingId')} placeholder="Select building">
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <FormErrorMessage>{errors.buildingId?.message}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.floor}>
            <FormLabel>Floor</FormLabel>
            <Input {...register('floor')} placeholder="e.g. 3F" />
            <FormErrorMessage>{errors.floor?.message}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.roomNumber}>
            <FormLabel>Room No.</FormLabel>
            <Input {...register('roomNumber')} placeholder="e.g. Rm 10" />
            <FormErrorMessage>{errors.roomNumber?.message}</FormErrorMessage>
          </FormControl>
        </Stack>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl isInvalid={!!errors.area}>
            <FormLabel>Area (sqm)</FormLabel>
            <NumberInput min={0} defaultValue={defaultValues?.area ?? 0} onChange={(_, v) => setValue('area', v)}>
              <NumberInputField />
            </NumberInput>
            <FormErrorMessage>{errors.area?.message}</FormErrorMessage>
          </FormControl>
          <FormControl>
            <FormLabel>Lessee No.</FormLabel>
            <Input {...register('tenantCode')} placeholder="e.g. T-001" />
          </FormControl>
          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormControl>
        </Stack>

        <Divider />
        <Heading size="sm">Lessee Information</Heading>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl isInvalid={!!errors.lesseeName}>
            <FormLabel>Lessee Name</FormLabel>
            <Input {...register('lesseeName')} placeholder="Full name or company" />
            <FormErrorMessage>{errors.lesseeName?.message}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.contactEmail}>
            <FormLabel>Email</FormLabel>
            <Input {...register('contactEmail')} type="email" placeholder="email@example.com" />
            <FormErrorMessage>{errors.contactEmail?.message}</FormErrorMessage>
          </FormControl>
        </Stack>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl isInvalid={!!errors.contactPhone}>
            <FormLabel>Phone</FormLabel>
            <Input {...register('contactPhone')} placeholder="09XX-XXX-XXXX" />
            <FormErrorMessage>{errors.contactPhone?.message}</FormErrorMessage>
          </FormControl>
          <FormControl>
            <FormLabel>TIN</FormLabel>
            <Input {...register('tin')} placeholder="Tax Identification Number" />
          </FormControl>
        </Stack>

        <Divider />
        <Heading size="sm">Billing Defaults</Heading>
        <FormControl isInvalid={!!errors.defaultRent}>
          <FormLabel>Default Monthly Rent (₱)</FormLabel>
          <NumberInput min={0} defaultValue={defaultValues?.defaultRent ?? 0} onChange={(_, v) => setValue('defaultRent', v)}>
            <NumberInputField />
          </NumberInput>
          <FormErrorMessage>{errors.defaultRent?.message}</FormErrorMessage>
        </FormControl>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb={0}>VAT Enabled</FormLabel>
            <Switch {...register('vatEnabled')} />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb={0}>Withholding Tax</FormLabel>
            <Switch {...register('withholdingTaxEnabled')} />
          </FormControl>
        </Stack>
        <FormControl>
          <FormLabel>Electricity Billing</FormLabel>
          <Select {...register('electricityMode')}>
            <option value="metered">Metered</option>
            <option value="direct">Direct</option>
          </Select>
        </FormControl>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl>
            <FormLabel>Water Billing</FormLabel>
            <Select {...register('waterMode')}>
              <option value="fixed">Fixed</option>
              <option value="metered">Metered</option>
              <option value="direct">Direct</option>
            </Select>
          </FormControl>
          {waterMode === 'fixed' && (
            <FormControl>
              <FormLabel>Fixed Water Amount (₱)</FormLabel>
              <NumberInput min={0} defaultValue={defaultValues?.defaultFixedWater ?? 0} onChange={(_, v) => setValue('defaultFixedWater', v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          )}
          {waterMode === 'metered' && (
            <FormControl>
              <FormLabel>Water Rate (₱/m³)</FormLabel>
              <NumberInput min={0} defaultValue={defaultValues?.defaultWaterRate ?? 0} onChange={(_, v) => setValue('defaultWaterRate', v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          )}
        </Stack>
        <FormControl>
          <FormLabel>Default Guard (₱)</FormLabel>
          <NumberInput min={0} defaultValue={defaultValues?.defaultGuard ?? 0} onChange={(_, v) => setValue('defaultGuard', v)}>
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <FormControl display="flex" alignItems="center">
          <FormLabel mb={0}>Penalty Enabled</FormLabel>
          <Switch {...register('penaltyEnabled')} defaultChecked={defaultValues?.penaltyEnabled ?? true} />
        </FormControl>

        <Divider />
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <Heading size="sm">Contracts</Heading>
          <Button
            size="sm"
            variant="outline"
            onClick={() => appendContract({ id: crypto.randomUUID(), startDate: '', endDate: '', rentAmount: 0, deposit: 0, notes: '' })}
          >
            + Add Contract
          </Button>
        </HStack>
        {contractFields.map((field, idx) => {
          const contractDocs = tenantId && field.id ? documents.filter(d => d.contractId === field.id) : [];
          return (
          <Box key={field._key} p={3} border="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">Contract {idx + 1}</Text>
              <Tooltip label="Remove contract">
                <IconButton
                  aria-label="Remove contract"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => handleRemoveContract(idx, field.id)}
                />
              </Tooltip>
            </HStack>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={2}>
              <FormControl>
                <FormLabel fontSize="sm">Start Date</FormLabel>
                <Input type="date" {...register(`contracts.${idx}.startDate`)} size="sm" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">End Date</FormLabel>
                <Input type="date" {...register(`contracts.${idx}.endDate`)} size="sm" />
              </FormControl>
            </Stack>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Rent Amount (₱)</FormLabel>
                <NumberInput size="sm" min={0} defaultValue={field.rentAmount} onChange={(_, v) => setValue(`contracts.${idx}.rentAmount`, v)}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Deposit (₱)</FormLabel>
                <NumberInput size="sm" min={0} defaultValue={field.deposit} onChange={(_, v) => setValue(`contracts.${idx}.deposit`, v)}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </Stack>
            <HStack mt={2} align="end" flexWrap="wrap">
              <FormControl>
                <FormLabel fontSize="sm">Notes</FormLabel>
                <Input size="sm" {...register(`contracts.${idx}.notes`)} placeholder="Optional notes" />
              </FormControl>
              {tenantId && field.id ? (
                <Button size="xs" variant="outline" whiteSpace="nowrap" onClick={() => handleAttachClick(field.id!)}>
                  Attach lease PDF
                </Button>
              ) : (
                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">Save tenant to attach files</Text>
              )}
            </HStack>
            {contractDocs.length > 0 && (
              <Box mt={2}>
                <DocumentList
                  documents={contractDocs}
                  onDelete={(id) => setDocuments(prev => prev.filter(d => d.id !== id))}
                  onUpdate={(updated) => setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))}
                />
              </Box>
            )}
          </Box>
          );
        })}

        <HStack justify="flex-end" pt={2} flexWrap="wrap" gap={2}>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" colorScheme="blue" isLoading={isLoading}>
            {defaultValues?.id ? 'Update Tenant' : 'Create Tenant'}
          </Button>
        </HStack>
      </VStack>

      {tenantId && uploadContractId && (
        <DocumentUploadModal
          isOpen={uploadOpen}
          onClose={closeUpload}
          parentType="TENANT"
          parentId={tenantId}
          contractId={uploadContractId}
          defaultCategory="lease_contract"
          onUploaded={(doc) => setDocuments(prev => [...prev, doc])}
        />
      )}
    </form>
  );
}
