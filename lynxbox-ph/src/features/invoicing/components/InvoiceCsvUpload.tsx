'use client';
import { useRef, useState, ChangeEvent } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, Text, Box, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Alert, AlertIcon, Progress, useToast, TableContainer,
} from '@chakra-ui/react';
import { Tenant, Invoice } from '@/features/invoicing/types';
import { invoiceService } from '@/services/invoiceService';

// ── template ──────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'lesseeNo',
  'billingMonth',
  'rent',
  'electricityPresentReading',
  'electricityPreviousReading',
  'electricityRate',
  'waterPresentReading',
  'waterPreviousReading',
  'waterAmount',
  'guard',
  'discount',
  'status',
];

const EXAMPLE_ROW = [
  'T-001',
  '2025-01',
  '15000',
  '100',
  '80',
  '11.50',
  '',
  '',
  '500',
  '2000',
  '0',
  'draft',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  return parseFloat((val || '').replace(/,/g, '')) || 0;
}

function normalizeBillingMonth(val: string): string {
  if (!val) return val;
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(val)) return val;
  // MM/YYYY
  const slash = val.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, '0')}`;
  // MM-YYYY (non-ISO)
  const dash = val.match(/^(\d{1,2})-(\d{4})$/);
  if (dash) return `${dash[2]}-${dash[1].padStart(2, '0')}`;
  return val;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// ── row validation ────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  data: Record<string, string>;
  errors: string[];
  isDuplicate?: boolean;
  tenantId?: string;
  lesseeName?: string;
  payload?: Record<string, any>;
}

function validateRow(
  data: Record<string, string>,
  tenants: Tenant[],
  rowNum: number,
  existingKeys: Set<string>,
): ParsedRow {
  const errors: string[] = [];

  if (!data.lesseeNo)     errors.push('lesseeNo required');
  if (!data.billingMonth) errors.push('billingMonth required');

  const tenant = data.lesseeNo
    ? tenants.find(t => t.tenantCode === data.lesseeNo)
    : undefined;
  if (data.lesseeNo && !tenant) errors.push(`Lessee "${data.lesseeNo}" not found`);

  const month = normalizeBillingMonth(data.billingMonth || '');
  if (data.billingMonth && !/^\d{4}-\d{2}$/.test(month))
    errors.push('billingMonth must be YYYY-MM or MM/YYYY');

  const validStatuses = ['draft', 'sent', 'partial', 'paid', 'printed'];
  if (data.status && !validStatuses.includes(data.status))
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);

  const isDuplicate = !!(tenant && month && existingKeys.has(`${tenant.id}:${month}`));

  let payload: Record<string, any> | undefined;
  if (errors.length === 0 && tenant && !isDuplicate) {
    const hasElecReading = data.electricityPresentReading || data.electricityPreviousReading;
    const hasWaterReading = data.waterPresentReading || data.waterPreviousReading;

    payload = {
      tenantId: tenant.id,
      billingMonth: month,
      ...(data.rent         ? { rent: parseNum(data.rent) } : {}),
      ...(data.guard        ? { guard: parseNum(data.guard) } : {}),
      ...(data.discount     ? { discount: parseNum(data.discount) } : {}),
      ...(data.status       ? { status: data.status } : {}),
      ...(hasElecReading || data.electricityRate ? {
        electricity: {
          presentReading:  parseNum(data.electricityPresentReading),
          previousReading: parseNum(data.electricityPreviousReading),
          ...(data.electricityRate ? { rate: parseNum(data.electricityRate) } : {}),
        },
      } : {}),
      ...(hasWaterReading || data.waterAmount ? {
        water: {
          mode: hasWaterReading ? 'metered' : 'fixed',
          ...(hasWaterReading ? {
            presentReading:  parseNum(data.waterPresentReading),
            previousReading: parseNum(data.waterPreviousReading),
          } : {}),
          ...(data.waterAmount ? { amount: parseNum(data.waterAmount) } : {}),
        },
      } : {}),
    };
  }

  return { rowNum, data, errors, isDuplicate, tenantId: tenant?.id, lesseeName: tenant?.lesseeName, payload };
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  invoices: Invoice[];
  onImported: () => void;
}

export function InvoiceCsvUpload({ isOpen, onClose, tenants, invoices, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const downloadTemplate = () => {
    const csv = [CSV_HEADERS.join(','), EXAMPLE_ROW.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Build a set of existing tenantId:billingMonth for duplicate detection
    const existingKeys = new Set(
      invoices.map(inv => `${inv.tenantId}:${inv.billingMonth}`)
    );
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast({ title: 'CSV has no data rows', status: 'warning' });
        return;
      }
      const headers = parsed[0].map(h => h.trim());
      const result = parsed.slice(1).map((cols, i) => {
        const data: Record<string, string> = {};
        headers.forEach((h, j) => { data[h] = cols[j] ?? ''; });
        return validateRow(data, tenants, i + 2, existingKeys);
      });
      setRows(result);
    };
    reader.readAsText(file);
  };

  const errorRows     = rows.filter(r => r.errors.length > 0);
  const duplicateRows = rows.filter(r => r.errors.length === 0 && r.isDuplicate);
  const validRows     = rows.filter(r => r.errors.length === 0 && !r.isDuplicate);

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < validRows.length; i++) {
      try {
        await invoiceService.createInvoice(validRows[i].payload!);
        successCount++;
      } catch {
        failCount++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    setImporting(false);
    toast({
      title: `Created ${successCount} invoice${successCount !== 1 ? 's' : ''}` +
        (duplicateRows.length > 0 ? `, ${duplicateRows.length} duplicate${duplicateRows.length !== 1 ? 's' : ''} skipped` : '') +
        (failCount > 0 ? `, ${failCount} failed` : ''),
      status: failCount > 0 ? 'warning' : 'success',
    });
    if (successCount > 0) {
      onImported();
      handleClose();
    }
  };

  const handleClose = () => {
    setRows([]);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Import Invoices from CSV</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text fontWeight="semibold" mb={1} fontSize="sm">Step 1 — Download the template</Text>
              <Text fontSize="xs" color="gray.600" mb={3}>
                Required: <strong>lesseeNo</strong> (must match an existing tenant), <strong>billingMonth</strong> (YYYY-MM or MM/YYYY).
                All other fields are optional — rent, electricity readings, water amount, guard, and discount
                default to each tenant&apos;s configured values if left blank.
                Electricity and water are only included in the payload if you provide at least one reading or amount.
              </Text>
              <Button size="sm" variant="outline" onClick={downloadTemplate}>
                Download Template CSV
              </Button>
            </Box>

            <Box p={4} borderWidth={1} borderRadius="md">
              <Text fontWeight="semibold" mb={2} fontSize="sm">Step 2 — Upload your filled CSV</Text>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} />
            </Box>

            {rows.length > 0 && (
              <>
                <HStack>
                  <Badge colorScheme="green" px={2} py={1}>{validRows.length} to create</Badge>
                  {duplicateRows.length > 0 && (
                    <Badge colorScheme="yellow" px={2} py={1}>{duplicateRows.length} duplicate{duplicateRows.length !== 1 ? 's' : ''} (skipped)</Badge>
                  )}
                  {errorRows.length > 0 && (
                    <Badge colorScheme="red" px={2} py={1}>{errorRows.length} with errors (skipped)</Badge>
                  )}
                </HStack>

                {duplicateRows.length > 0 && (
                  <Alert status="info" fontSize="sm">
                    <AlertIcon />
                    Duplicate rows (same lessee + billing month already in system) will be skipped.
                    To update an existing invoice, edit it directly.
                  </Alert>
                )}
                {errorRows.length > 0 && (
                  <Alert status="warning" fontSize="sm">
                    <AlertIcon />
                    Fix the errors in your CSV and re-upload to include all rows.
                  </Alert>
                )}

                <TableContainer maxH="360px" overflowY="auto" borderWidth={1} borderRadius="md">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                      <Tr>
                        <Th>Row</Th>
                        <Th>Lessee No.</Th>
                        <Th>Lessee Name</Th>
                        <Th>Billing Month</Th>
                        <Th isNumeric>Rent (₱)</Th>
                        <Th>Status</Th>
                        <Th>Result</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rows.map(row => (
                        <Tr key={row.rowNum}
                          bg={row.errors.length > 0 ? 'red.50' : row.isDuplicate ? 'yellow.50' : undefined}>
                          <Td>{row.rowNum}</Td>
                          <Td fontFamily="mono" fontSize="xs">{row.data.lesseeNo || '—'}</Td>
                          <Td>{row.lesseeName || '—'}</Td>
                          <Td fontSize="xs">{normalizeBillingMonth(row.data.billingMonth || '') || '—'}</Td>
                          <Td isNumeric>{row.data.rent || '(default)'}</Td>
                          <Td>{row.data.status || 'draft'}</Td>
                          <Td>
                            {row.errors.length > 0
                              ? <Badge colorScheme="red">Error</Badge>
                              : row.isDuplicate
                              ? <Badge colorScheme="yellow">Duplicate</Badge>
                              : <Badge colorScheme="green">Create</Badge>}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>

                {errorRows.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold" color="red.600" mb={1}>Error details:</Text>
                    {errorRows.map(row => (
                      <Text key={row.rowNum} fontSize="xs" color="red.500">
                        Row {row.rowNum} ({row.data.lesseeNo || 'unknown'}): {row.errors.join('; ')}
                      </Text>
                    ))}
                  </Box>
                )}
              </>
            )}

            {importing && (
              <Box>
                <Text fontSize="sm" mb={1}>Importing… {progress}%</Text>
                <Progress value={progress} size="sm" colorScheme="blue" borderRadius="md" />
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack>
            <Button variant="ghost" onClick={handleClose} isDisabled={importing}>Cancel</Button>
            {(validRows.length > 0 || duplicateRows.length > 0) && (
              <Button colorScheme="blue" onClick={handleImport} isLoading={importing} isDisabled={validRows.length === 0}>
                {validRows.length > 0
                  ? `Create ${validRows.length} Invoice${validRows.length !== 1 ? 's' : ''}`
                  : 'Nothing to Create'}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
