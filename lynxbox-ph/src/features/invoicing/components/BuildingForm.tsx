'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  VStack, FormControl, FormLabel, FormErrorMessage, Input,
  NumberInput, NumberInputField, Button, HStack,
} from '@chakra-ui/react';
import { Building } from '@/features/invoicing/types';

const schema = z.object({
  name: z.string().min(1, 'Building name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().regex(/^[+\d][\d\s\-()\\.]{6,18}$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  currentElectricityRate: z.number().min(0),
  vatRate: z.number().min(0).max(1),
  withholdingTaxRate: z.number().min(0).max(1),
  waterRate: z.number().min(0),
  defaultFixedWaterAmount: z.number().min(0),
  penaltyRate: z.number().min(0).max(1),
  earlyPaymentDiscountRate: z.number().min(0).max(1),
  earlyPaymentDays: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Building>;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function BuildingForm({ defaultValues, onSubmit, onCancel, isLoading }: Props) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || '',
      address: defaultValues?.address || '',
      phone: defaultValues?.phone || '',
      email: defaultValues?.email || '',
      currentElectricityRate: defaultValues?.currentElectricityRate ?? 0,
      vatRate: defaultValues?.vatRate ?? 0.12,
      withholdingTaxRate: defaultValues?.withholdingTaxRate ?? 0.05,
      waterRate: defaultValues?.waterRate ?? 0,
      defaultFixedWaterAmount: defaultValues?.defaultFixedWaterAmount ?? 0,
      penaltyRate: defaultValues?.penaltyRate ?? 0.05,
      earlyPaymentDiscountRate: defaultValues?.earlyPaymentDiscountRate ?? 0,
      earlyPaymentDays: defaultValues?.earlyPaymentDays ?? 5,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={!!errors.name}>
          <FormLabel>Building Name</FormLabel>
          <Input {...register('name')} placeholder="e.g. Santos Building" />
          <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.address}>
          <FormLabel>Address</FormLabel>
          <Input {...register('address')} placeholder="e.g. 123 Rizal Ave., Ermita, Manila" />
          <FormErrorMessage>{errors.address?.message}</FormErrorMessage>
        </FormControl>

        <HStack>
          <FormControl isInvalid={!!errors.phone}>
            <FormLabel>Phone</FormLabel>
            <Input {...register('phone')} placeholder="e.g. 02-8123-4567" />
            <FormErrorMessage>{errors.phone?.message}</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!!errors.email}>
            <FormLabel>Email (optional)</FormLabel>
            <Input {...register('email')} type="email" placeholder="e.g. info@santosbuilding.com" />
            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
          </FormControl>
        </HStack>

        <HStack>
          <FormControl isInvalid={!!errors.vatRate}>
            <FormLabel>VAT Rate (%)</FormLabel>
            <NumberInput
              min={0} max={100}
              defaultValue={(defaultValues?.vatRate ?? 0.12) * 100}
              onChange={(_, v) => setValue('vatRate', v / 100)}
            >
              <NumberInputField placeholder="12" />
            </NumberInput>
            <FormErrorMessage>{errors.vatRate?.message}</FormErrorMessage>

          </FormControl>

          <FormControl isInvalid={!!errors.withholdingTaxRate}>
            <FormLabel>Withholding Tax Rate (%)</FormLabel>
            <NumberInput
              min={0} max={100}
              defaultValue={(defaultValues?.withholdingTaxRate ?? 0.05) * 100}
              onChange={(_, v) => setValue('withholdingTaxRate', v / 100)}
            >
              <NumberInputField placeholder="5" />
            </NumberInput>
            <FormErrorMessage>{errors.withholdingTaxRate?.message}</FormErrorMessage>
          </FormControl>
        </HStack>

        <FormControl isInvalid={!!errors.currentElectricityRate}>
          <FormLabel>Electricity Rate (₱/kWh)</FormLabel>
          <NumberInput
            min={0}
            defaultValue={defaultValues?.currentElectricityRate ?? 0}
            onChange={(_, v) => setValue('currentElectricityRate', v)}
          >
            <NumberInputField placeholder="12.50" />
          </NumberInput>
          <FormErrorMessage>{errors.currentElectricityRate?.message}</FormErrorMessage>
        </FormControl>

        <HStack>
          <FormControl isInvalid={!!errors.waterRate}>
            <FormLabel>Water Rate (₱/m³)</FormLabel>
            <NumberInput
              min={0}
              defaultValue={defaultValues?.waterRate ?? 0}
              onChange={(_, v) => setValue('waterRate', v)}
            >
              <NumberInputField placeholder="35.00" />
            </NumberInput>
            <FormErrorMessage>{errors.waterRate?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.defaultFixedWaterAmount}>
            <FormLabel>Default Fixed Water (₱)</FormLabel>
            <NumberInput
              min={0}
              defaultValue={defaultValues?.defaultFixedWaterAmount ?? 0}
              onChange={(_, v) => setValue('defaultFixedWaterAmount', v)}
            >
              <NumberInputField placeholder="500.00" />
            </NumberInput>
            <FormErrorMessage>{errors.defaultFixedWaterAmount?.message}</FormErrorMessage>
          </FormControl>
        </HStack>

        <HStack>
          <FormControl isInvalid={!!errors.penaltyRate}>
            <FormLabel>Penalty Rate (%)</FormLabel>
            <NumberInput
              min={0}
              max={100}
              defaultValue={(defaultValues?.penaltyRate ?? 0.05) * 100}
              onChange={(_, v) => setValue('penaltyRate', v / 100)}
            >
              <NumberInputField placeholder="5" />
            </NumberInput>
            <FormErrorMessage>{errors.penaltyRate?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.earlyPaymentDiscountRate}>
            <FormLabel>Early Payment Discount (%)</FormLabel>
            <NumberInput
              min={0}
              max={100}
              defaultValue={(defaultValues?.earlyPaymentDiscountRate ?? 0) * 100}
              onChange={(_, v) => setValue('earlyPaymentDiscountRate', v / 100)}
            >
              <NumberInputField placeholder="0" />
            </NumberInput>
            <FormErrorMessage>{errors.earlyPaymentDiscountRate?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.earlyPaymentDays}>
            <FormLabel>Early Payment Days</FormLabel>
            <NumberInput
              min={0}
              defaultValue={defaultValues?.earlyPaymentDays ?? 5}
              onChange={(_, v) => setValue('earlyPaymentDays', v)}
            >
              <NumberInputField placeholder="5" />
            </NumberInput>
            <FormErrorMessage>{errors.earlyPaymentDays?.message}</FormErrorMessage>
          </FormControl>
        </HStack>

        <HStack justify="flex-end" pt={2}>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" colorScheme="blue" isLoading={isLoading}>
            {defaultValues?.id ? 'Update Building' : 'Create Building'}
          </Button>
        </HStack>
      </VStack>
    </form>
  );
}
