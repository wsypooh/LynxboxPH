'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, FormErrorMessage, Input, NumberInput, NumberInputField, Button, VStack, Textarea, Select,
} from '@chakra-ui/react';

const PAYMENT_METHODS = [
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'gcash', label: 'GCash' },
  { value: 'online_banking', label: 'Online Banking' },
] as const;

const schema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
  maxAmount?: number;
}

export function PaymentModal({ isOpen, onClose, onSubmit, isLoading, maxAmount }: Props) {
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: maxAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'check',
      note: '',
    },
  });

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Record Payment</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit(async (data) => { await onSubmit(data); handleClose(); })}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.amount}>
                <FormLabel>Amount (₱)</FormLabel>
                <NumberInput min={0} max={maxAmount} defaultValue={maxAmount} onChange={(_, v) => setValue('amount', v)}>
                  <NumberInputField />
                </NumberInput>
                <FormErrorMessage>{errors.amount?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.date}>
                <FormLabel>Date</FormLabel>
                <Input type="date" {...register('date')} />
                <FormErrorMessage>{errors.date?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.paymentMethod}>
                <FormLabel>Payment Method</FormLabel>
                <Select {...register('paymentMethod')}>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.paymentMethod?.message}</FormErrorMessage>
              </FormControl>
              <FormControl>
                <FormLabel>Note (optional)</FormLabel>
                <Textarea {...register('note')} placeholder="e.g. Reference #1234" rows={2} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>Cancel</Button>
            <Button type="submit" colorScheme="green" isLoading={isLoading}>Record Payment</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
