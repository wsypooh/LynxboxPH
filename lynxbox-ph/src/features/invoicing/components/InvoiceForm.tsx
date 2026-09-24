'use client';
import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  VStack, HStack, Stack, FormControl, FormLabel, Input, NumberInput, NumberInputField,
  Button, Select, Heading, Divider, Box, Text, Table, Thead, Tbody, Tr, Th, Td,
} from '@chakra-ui/react';
import { Invoice, Tenant, Building, PreviousBalanceEntry } from '@/features/invoicing/types';

const schema = z.object({
  tenantId: z.string().min(1),
  billingMonth: z.string().min(1),
  rent: z.number().min(0),
  vat: z.number().min(0),
  withholdingTax: z.number().min(0),
  water: z.object({
    mode: z.enum(['metered', 'fixed', 'direct']),
    presentReading: z.number().optional(),
    previousReading: z.number().optional(),
    rate: z.number().optional(),
    amount: z.number().min(0),
  }),
  electricity: z.object({
    presentReading: z.number().min(0),
    previousReading: z.number().min(0),
    rate: z.number().min(0),
    amount: z.number().min(0),
  }),
  guard: z.number().min(0),
  otherCharges: z.array(z.object({ description: z.string(), amount: z.number() })),
  discount: z.number().min(0),
  previousBalanceHistory: z.array(z.object({
    invoiceNumber: z.string(),
    billingMonth: z.string(),
    billingLabel: z.string(),
    amountDue: z.number(),
    amountPaid: z.number(),
    outstanding: z.number(),
    penalty: z.number().min(0),
  })),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  tenants: Tenant[];
  buildings: Building[];
  defaultValues?: Partial<Invoice>;
  draftData?: Partial<FormValues>;
  onSubmit: (data: FormValues & { previousBalance: number }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  previousBalanceHistory?: PreviousBalanceEntry[];
  previousElectricityReading?: number;
  previousWaterReading?: number;
}

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceForm({
  tenants,
  buildings,
  defaultValues,
  draftData,
  onSubmit,
  onCancel,
  isLoading,
  previousBalanceHistory = [],
  previousElectricityReading,
  previousWaterReading,
}: Props) {
  const { register, handleSubmit, setValue, watch, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: draftData || {
      tenantId: defaultValues?.tenantId || '',
      billingMonth: defaultValues?.billingMonth || '',
      rent: defaultValues?.rent ?? 0,
      vat: defaultValues?.vat ?? 0,
      withholdingTax: Math.abs(defaultValues?.withholdingTax ?? 0),
      water: defaultValues?.water || { mode: 'fixed', amount: 0 },
      electricity: defaultValues?.electricity || { presentReading: 0, previousReading: 0, rate: 0, amount: 0 },
      guard: defaultValues?.guard ?? 0,
      otherCharges: defaultValues?.otherCharges ?? [],
      discount: defaultValues?.discount ?? 0,
      previousBalanceHistory,
    },
  });

  const { fields: otherFields, append: appendOther, remove: removeOther } = useFieldArray({ control, name: 'otherCharges' });
  const { fields: prevBalanceFields } = useFieldArray({ control, name: 'previousBalanceHistory' });
  const vals = watch();

  const tenantId = vals.tenantId;
  const selectedTenant = tenants.find(t => t.id === tenantId);
  const selectedBuilding = buildings.find(b => b.id === selectedTenant?.buildingId);
  const electricityDirect = selectedTenant?.electricityMode === 'direct';
  const waterDirect = selectedTenant?.waterMode === 'direct';

  // Auto-fill from tenant when tenant changes
  useEffect(() => {
    if (selectedTenant && !defaultValues?.id) {
      const vatRate = selectedBuilding?.vatRate ?? 0.12;
      const wtRate = selectedBuilding?.withholdingTaxRate ?? 0.05;
      setValue('rent', selectedTenant.defaultRent);
      setValue('vat', selectedTenant.vatEnabled ? Math.round(selectedTenant.defaultRent * vatRate * 100) / 100 : 0);
      setValue('withholdingTax', selectedTenant.withholdingTaxEnabled ? Math.round(selectedTenant.defaultRent * wtRate * 100) / 100 : 0);
      setValue('guard', selectedTenant.defaultGuard ?? 0);
      setValue('water.mode', selectedTenant.waterMode);
      if (selectedTenant.waterMode === 'fixed') {
        setValue('water.amount', selectedTenant.defaultFixedWater ?? selectedBuilding?.defaultFixedWaterAmount ?? 0);
      }
      if (selectedTenant.waterMode === 'metered' && selectedBuilding) {
        setValue('water.rate', selectedTenant.defaultWaterRate ?? selectedBuilding.waterRate ?? 0);
      }
      if (selectedBuilding) {
        setValue('electricity.rate', selectedBuilding.currentElectricityRate);
      }
      if (previousElectricityReading !== undefined && !electricityDirect) {
        setValue('electricity.previousReading', previousElectricityReading);
      }
      if (previousWaterReading !== undefined && selectedTenant.waterMode === 'metered') {
        setValue('water.previousReading', previousWaterReading);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Auto-compute electricity amount
  useEffect(() => {
    const { presentReading, previousReading, rate } = vals.electricity;
    const amount = Math.max(0, ((presentReading || 0) - (previousReading || 0)) * (rate || 0));
    setValue('electricity.amount', amount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals.electricity.presentReading, vals.electricity.previousReading, vals.electricity.rate]);

  // Auto-compute water amount (metered mode)
  useEffect(() => {
    if (vals.water.mode === 'metered') {
      const amount = Math.max(0, ((vals.water.presentReading || 0) - (vals.water.previousReading || 0)) * (vals.water.rate || 0));
      setValue('water.amount', amount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals.water.mode, vals.water.presentReading, vals.water.previousReading, vals.water.rate]);

  // Compute totals
  const rent = vals.rent || 0;
  const vat = vals.vat || 0;
  const wt = vals.withholdingTax || 0;
  const subtotal = rent + vat - wt;
  const waterAmt = vals.water?.amount || 0;
  const elecAmt = vals.electricity?.amount || 0;
  const guard = vals.guard || 0;
  const othersTotal = (vals.otherCharges || []).reduce((s, c) => s + (c.amount || 0), 0);
  const discount = vals.discount || 0;
  const currentChargesTotal = subtotal + waterAmt + elecAmt + guard + othersTotal - discount;
  const previousBalanceHistoryVals = vals.previousBalanceHistory || [];
  const previousBalance = previousBalanceHistoryVals.reduce((s, e) => s + (e.outstanding || 0) + (e.penalty || 0), 0);
  const totalDue = currentChargesTotal + previousBalance;

  return (
    <form onSubmit={handleSubmit(data => onSubmit({ ...data, previousBalance }))}>
      <VStack spacing={5} align="stretch">
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl isRequired>
            <FormLabel>Tenant</FormLabel>
            <Select {...register('tenantId')} placeholder="Select tenant">
              {tenants.filter(t => t.status === 'active').map(t => (
                <option key={t.id} value={t.id}>{t.tenantCode} — {t.lesseeName} ({t.floor} {t.roomNumber})</option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Billing Month</FormLabel>
            <Input type="month" {...register('billingMonth')} />
          </FormControl>
        </Stack>

        {selectedBuilding && (
          <Box p={2} bg="blue.50" borderRadius="md" fontSize="sm">
            <Text><b>Building:</b> {selectedBuilding.name} — Electricity rate: ₱{selectedBuilding.currentElectricityRate}/kWh</Text>
          </Box>
        )}

        <Divider />
        <Heading size="sm">Rent &amp; Tax</Heading>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl>
            <FormLabel>Rent (₱)</FormLabel>
            <NumberInput min={0} value={vals.rent} onChange={(_, v) => {
              setValue('rent', v);
              if (selectedTenant?.vatEnabled) setValue('vat', Math.round(v * 0.12 * 100) / 100);
              if (selectedTenant?.withholdingTaxEnabled) setValue('withholdingTax', Math.round(v * 0.05 * 100) / 100);
            }}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>VAT — 12% (₱)</FormLabel>
            <NumberInput min={0} value={vals.vat} onChange={(_, v) => setValue('vat', v)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Less: Withholding Tax — 5% (₱)</FormLabel>
            <NumberInput min={0} value={vals.withholdingTax} onChange={(_, v) => setValue('withholdingTax', v)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
        </Stack>
        <Box p={2} bg="gray.50" borderRadius="md">
          <Text fontSize="sm"><b>Subtotal:</b> {fmt(subtotal)}</Text>
        </Box>

        <Divider />
        <Heading size="sm">Water</Heading>
        <HStack>
          <FormControl>
            <FormLabel>Mode</FormLabel>
            <Select {...register('water.mode')}>
              <option value="fixed">Fixed Amount</option>
              <option value="metered">Metered</option>
            </Select>
          </FormControl>
        </HStack>
        {waterDirect ? (
          <Box p={2} bg="orange.50" borderRadius="md" fontSize="sm">
            <Text color="orange.700">This tenant pays water directly to the provider — not billed here.</Text>
          </Box>
        ) : vals.water?.mode === 'metered' ? (
          <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
            <FormControl>
              <FormLabel>Present Reading (m³)</FormLabel>
              <NumberInput min={0} value={vals.water.presentReading ?? 0} onChange={(_, v) => setValue('water.presentReading', v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Previous Reading (m³)</FormLabel>
              <NumberInput min={0} value={vals.water.previousReading ?? 0} onChange={(_, v) => setValue('water.previousReading', v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Consumption (m³)</FormLabel>
              <NumberInput isReadOnly value={Math.max(0, (vals.water.presentReading ?? 0) - (vals.water.previousReading ?? 0))}>
                <NumberInputField bg="gray.50" />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Rate (₱/m³)</FormLabel>
              <NumberInput min={0} value={vals.water.rate ?? 0} onChange={(_, v) => setValue('water.rate', v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Amount (₱)</FormLabel>
              <NumberInput min={0} value={vals.water.amount} onChange={(_, v) => setValue('water.amount', v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </Stack>
        ) : (
          <FormControl>
            <FormLabel>Fixed Water Amount (₱)</FormLabel>
            <NumberInput min={0} value={vals.water?.amount ?? 0} onChange={(_, v) => setValue('water.amount', v)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
        )}

        <Divider />
        <Heading size="sm">Electricity</Heading>
        {electricityDirect ? (
          <Box p={2} bg="orange.50" borderRadius="md" fontSize="sm">
            <Text color="orange.700">This tenant pays electricity directly to the provider — not billed here.</Text>
          </Box>
        ) : (<Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl>
            <FormLabel>Present Reading (kWh)</FormLabel>
            <NumberInput min={0} value={vals.electricity.presentReading} onChange={(_, v) => setValue('electricity.presentReading', v)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Previous Reading (kWh)</FormLabel>
            <NumberInput min={0} value={vals.electricity.previousReading} onChange={(_, v) => setValue('electricity.previousReading', v)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Consumption (kWh)</FormLabel>
            <NumberInput isReadOnly value={Math.max(0, (vals.electricity.presentReading || 0) - (vals.electricity.previousReading || 0))}>
              <NumberInputField bg="gray.50" />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Rate (₱/kWh)</FormLabel>
            <NumberInput min={0} value={vals.electricity.rate} onChange={(_, v) => setValue('electricity.rate', v)}>
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Amount (₱)</FormLabel>
            <NumberInput min={0} value={vals.electricity.amount} isReadOnly>
              <NumberInputField bg="gray.50" />
            </NumberInput>
          </FormControl>
        </Stack>)}

        <Divider />
        <Heading size="sm">Other Charges</Heading>
        <FormControl>
          <FormLabel>Guard (₱)</FormLabel>
          <NumberInput min={0} value={vals.guard} onChange={(_, v) => setValue('guard', v)}>
            <NumberInputField />
          </NumberInput>
        </FormControl>
        {otherFields.map((field, idx) => (
          <Stack key={field.id} direction={{ base: 'column', md: 'row' }} spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Description</FormLabel>
              <Input {...register(`otherCharges.${idx}.description`)} placeholder="e.g. Generator Fee" size="sm" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Amount (₱)</FormLabel>
              <NumberInput min={0} size="sm" defaultValue={field.amount} onChange={(_, v) => setValue(`otherCharges.${idx}.amount`, v)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <Button size="sm" variant="ghost" colorScheme="red" mt={{ base: 0, md: 6 }} onClick={() => removeOther(idx)}>Remove</Button>
          </Stack>
        ))}
        <Button size="sm" variant="outline" onClick={() => appendOther({ description: '', amount: 0 })}>
          + Add Charge
        </Button>
        <FormControl>
          <FormLabel>Discount (₱)</FormLabel>
          <NumberInput min={0} value={vals.discount} onChange={(_, v) => setValue('discount', v)}>
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <Divider />
        <Heading size="sm">Summary</Heading>
        <Box p={4} bg="gray.50" borderRadius="md">
          <VStack align="stretch" spacing={1} fontSize="sm">
            <HStack justify="space-between"><Text>Rent</Text><Text>{fmt(rent)}</Text></HStack>
            {vat !== 0 && <HStack justify="space-between"><Text>VAT (12%)</Text><Text>{fmt(vat)}</Text></HStack>}
            {wt !== 0 && <HStack justify="space-between"><Text>Less: Withholding Tax (5%)</Text><Text color="red.500">({fmt(wt)})</Text></HStack>}
            <HStack justify="space-between" fontWeight="semibold"><Text>Subtotal</Text><Text>{fmt(subtotal)}</Text></HStack>
            <Box h={1} />
            <HStack justify="space-between"><Text>Water</Text><Text>{fmt(waterAmt)}</Text></HStack>
            <HStack justify="space-between"><Text>Electricity</Text><Text>{fmt(elecAmt)}</Text></HStack>
            <HStack justify="space-between"><Text>Guard</Text><Text>{fmt(guard)}</Text></HStack>
            <HStack justify="space-between"><Text>Other Charges</Text><Text>{fmt(othersTotal)}</Text></HStack>
            <HStack justify="space-between"><Text>Discount</Text><Text>-{fmt(discount)}</Text></HStack>
            <Divider />
            <HStack justify="space-between" fontWeight="bold"><Text>Current Charges</Text><Text>{fmt(currentChargesTotal)}</Text></HStack>
            <HStack justify="space-between"><Text>Previous Balance</Text><Text>{fmt(previousBalance)}</Text></HStack>
            <Divider />
            <HStack justify="space-between" fontWeight="bold" fontSize="md"><Text>Total Due</Text><Text color="blue.700">{fmt(totalDue)}</Text></HStack>
          </VStack>
        </Box>

        {prevBalanceFields.length > 0 && (
          <>
            <Heading size="sm">Previous Balance Detail</Heading>
            <Text fontSize="xs" color="gray.500">
              Penalty is auto-computed from the ledger but can be overridden below before this draft is sent —
              e.g. to waive or adjust a penalty for a specific charge. This only changes what&apos;s billed on
              this invoice; it doesn&apos;t change the ledger&apos;s own penalty formula going forward.
            </Text>
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Invoice #</Th><Th>Period</Th><Th isNumeric>Due</Th>
                    <Th isNumeric>Paid</Th><Th isNumeric>Outstanding</Th><Th isNumeric>Penalty</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {prevBalanceFields.map((field, i) => (
                    <Tr key={field.id}>
                      <Td>{field.invoiceNumber || '—'}</Td>
                      <Td>{field.billingLabel}</Td>
                      <Td isNumeric>{fmt(field.amountDue)}</Td>
                      <Td isNumeric>{fmt(field.amountPaid)}</Td>
                      <Td isNumeric>{fmt(field.outstanding)}</Td>
                      <Td isNumeric>
                        <NumberInput
                          size="sm" min={0}
                          value={vals.previousBalanceHistory?.[i]?.penalty ?? field.penalty}
                          onChange={(_, v) => setValue(`previousBalanceHistory.${i}.penalty`, v)}
                        >
                          <NumberInputField textAlign="right" />
                        </NumberInput>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </>
        )}

        <HStack justify="flex-end" pt={2} flexWrap="wrap" gap={2}>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" colorScheme="blue" isLoading={isLoading}>
            {defaultValues?.id ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </HStack>
      </VStack>
    </form>
  );
}
