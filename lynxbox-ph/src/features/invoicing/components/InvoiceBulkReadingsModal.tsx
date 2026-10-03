'use client';
import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, Text, Box, Table, Thead, Tbody, Tr, Th, Td,
  NumberInput, NumberInputField, Alert, AlertIcon, Progress, useToast, TableContainer,
} from '@chakra-ui/react';
import { Invoice } from '@/features/invoicing/types';
import { invoiceService } from '@/services/invoiceService';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isValidNum(s: string | undefined): boolean {
  return !!s && s.trim() !== '' && !isNaN(Number(s));
}

interface RowReadings {
  elec?: string;
  water?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onUpdated: () => void;
}

// One present-reading cell + its read-only previous/rate/amount neighbors, for either charge.
function MeterCells({
  metered, previousReading, rate, value, onChange,
}: {
  metered: boolean;
  previousReading: number;
  rate: number;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  if (!metered) {
    return (
      <>
        <Td isNumeric><Text color="gray.400">—</Text></Td>
        <Td isNumeric><Text color="gray.400">—</Text></Td>
        <Td isNumeric><Text color="gray.400">—</Text></Td>
        <Td isNumeric><Text color="gray.400">—</Text></Td>
      </>
    );
  }
  const valid = isValidNum(value);
  const present = valid ? Number(value) : undefined;
  const amount = present !== undefined ? round2(Math.max(0, (present - previousReading) * rate)) : undefined;
  const belowPrevious = present !== undefined && present < previousReading;

  return (
    <>
      <Td isNumeric>
        <NumberInput size="sm" w="110px" ml="auto" value={value ?? ''} onChange={onChange}>
          <NumberInputField placeholder={String(previousReading)} textAlign="right" />
        </NumberInput>
        {belowPrevious && <Text fontSize="xs" color="orange.500">below previous</Text>}
      </Td>
      <Td isNumeric>{previousReading}</Td>
      <Td isNumeric>{rate}</Td>
      <Td isNumeric>{amount !== undefined ? fmt(amount) : <Text color="gray.400">—</Text>}</Td>
    </>
  );
}

export function InvoiceBulkReadingsModal({ isOpen, onClose, invoices, onUpdated }: Props) {
  const [readings, setReadings] = useState<Record<string, RowReadings>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  // Only a draft can be edited (updateInvoice itself enforces this -- handler.ts:269), and only
  // a metered charge (electricity or water) has a reading to enter at all. Electricity only has
  // two modes ('metered' | 'direct'), and InvoiceForm.tsx's edit form has no mode field in its
  // submitted payload for electricity at all -- since updateInvoice replaces the whole charge
  // object rather than merging, any invoice ever saved through that form has electricity.mode
  // silently wiped to undefined even though its readings are still real metered data. So "not
  // explicitly direct" is the correct test here, not an exact 'metered' match (water keeps the
  // exact match since it genuinely has a third 'fixed' mode, and its mode IS in InvoiceForm's
  // submitted payload).
  const editableRows = invoices.filter(inv =>
    inv.status === 'draft' && (inv.electricity?.mode !== 'direct' || inv.water?.mode === 'metered')
  );
  const excludedCount = invoices.length - editableRows.length;
  const anyWaterMetered = editableRows.some(inv => inv.water?.mode === 'metered');

  const setElec = (id: string, v: string) => setReadings(prev => ({ ...prev, [id]: { ...prev[id], elec: v } }));
  const setWater = (id: string, v: string) => setReadings(prev => ({ ...prev, [id]: { ...prev[id], water: v } }));

  const rowsToSave = editableRows.filter(inv =>
    isValidNum(readings[inv.id]?.elec) || isValidNum(readings[inv.id]?.water)
  );

  const handleSave = async () => {
    setSaving(true);
    setProgress(0);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < rowsToSave.length; i++) {
      const inv = rowsToSave[i];
      const r = readings[inv.id];
      const payload: Record<string, any> = {};

      if (inv.electricity?.mode !== 'direct' && isValidNum(r?.elec)) {
        const presentReading = Number(r!.elec);
        const previousReading = inv.electricity.previousReading ?? 0;
        const rate = inv.electricity.rate ?? 0;
        payload.electricity = {
          mode: 'metered', presentReading, previousReading, rate,
          amount: round2(Math.max(0, (presentReading - previousReading) * rate)),
        };
      }
      if (inv.water?.mode === 'metered' && isValidNum(r?.water)) {
        const presentReading = Number(r!.water);
        const previousReading = inv.water.previousReading ?? 0;
        const rate = inv.water.rate ?? 0;
        payload.water = {
          mode: 'metered', presentReading, previousReading, rate,
          amount: round2(Math.max(0, (presentReading - previousReading) * rate)),
        };
      }

      try {
        await invoiceService.updateInvoice(inv.id, payload);
        successCount++;
      } catch {
        failCount++;
      }
      setProgress(Math.round(((i + 1) / rowsToSave.length) * 100));
    }
    setSaving(false);
    toast({
      title: `${successCount} reading${successCount !== 1 ? 's' : ''} saved` +
        (failCount > 0 ? `, ${failCount} failed` : ''),
      status: failCount > 0 ? 'warning' : 'success',
    });
    if (successCount > 0) {
      onUpdated();
      handleClose();
    }
  };

  const handleClose = () => {
    setReadings({});
    setProgress(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Enter Meter Readings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Type this month&apos;s present reading for each tenant. Previous reading and rate
              are shown for reference; the amount updates as you type. Only rows you fill in are saved.
            </Text>

            {excludedCount > 0 && (
              <Alert status="info" fontSize="sm">
                <AlertIcon />
                {excludedCount} selected invoice{excludedCount !== 1 ? 's' : ''} excluded — not a draft,
                or neither electricity nor water is metered for that tenant.
              </Alert>
            )}

            {editableRows.length === 0 ? (
              <Text fontSize="sm" color="gray.500">No editable invoices in the current selection.</Text>
            ) : (
              <TableContainer maxH="420px" overflowY="auto" borderWidth={1} borderRadius="md">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                    <Tr>
                      <Th rowSpan={2}>Lessee No.</Th>
                      <Th rowSpan={2}>Lessee Name</Th>
                      <Th colSpan={4} textAlign="center">Electricity</Th>
                      {anyWaterMetered && <Th colSpan={4} textAlign="center">Water</Th>}
                    </Tr>
                    <Tr>
                      <Th isNumeric>Present</Th>
                      <Th isNumeric>Previous</Th>
                      <Th isNumeric>Rate (₱)</Th>
                      <Th isNumeric>Amount</Th>
                      {anyWaterMetered && (
                        <>
                          <Th isNumeric>Present</Th>
                          <Th isNumeric>Previous</Th>
                          <Th isNumeric>Rate (₱)</Th>
                          <Th isNumeric>Amount</Th>
                        </>
                      )}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {editableRows.map(inv => (
                      <Tr key={inv.id}>
                        <Td fontFamily="mono" fontSize="xs">{inv.tenantCode}</Td>
                        <Td>{inv.lesseeName}</Td>
                        <MeterCells
                          metered={inv.electricity?.mode !== 'direct'}
                          previousReading={inv.electricity?.previousReading ?? 0}
                          rate={inv.electricity?.rate ?? 0}
                          value={readings[inv.id]?.elec}
                          onChange={v => setElec(inv.id, v)}
                        />
                        {anyWaterMetered && (
                          <MeterCells
                            metered={inv.water?.mode === 'metered'}
                            previousReading={inv.water?.previousReading ?? 0}
                            rate={inv.water?.rate ?? 0}
                            value={readings[inv.id]?.water}
                            onChange={v => setWater(inv.id, v)}
                          />
                        )}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}

            {saving && (
              <Box>
                <Text fontSize="sm" mb={1}>Saving… {progress}%</Text>
                <Progress value={progress} size="sm" colorScheme="blue" borderRadius="md" />
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button variant="ghost" onClick={handleClose} isDisabled={saving}>Cancel</Button>
            <Button
              colorScheme="blue" onClick={handleSave} isLoading={saving}
              isDisabled={rowsToSave.length === 0}
            >
              {rowsToSave.length > 0
                ? `Save ${rowsToSave.length} Reading${rowsToSave.length !== 1 ? 's' : ''}`
                : 'Nothing to Save'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
