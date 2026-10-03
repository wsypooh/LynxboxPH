'use client';
import { useRef, useState, ChangeEvent } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, Text, Box, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Alert, AlertIcon, Progress, useToast, TableContainer,
} from '@chakra-ui/react';
import { Tenant, Invoice } from '@/features/invoicing/types';
import { invoiceService } from '@/services/invoiceService';
import { readCsvFile, downloadCsv } from '@/lib/csv';

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
  action: 'create' | 'update' | 'skip';
  invoiceId?: string;
  existingStatus?: string;
  tenantId?: string;
  lesseeName?: string;
  payload?: Record<string, any>;
}

// Merges a CSV-supplied reading onto the existing invoice's electricity charge and recomputes
// `amount` client-side -- unlike createInvoice, updateInvoice does NOT derive amount from
// readings itself (handler.ts:283 uses `elec.amount` as given), so sending a reading-only
// payload through updateInvoice would silently zero out the charge.
function buildElectricityUpdate(data: Record<string, string>, existing: Invoice['electricity']) {
  const presentReading  = data.electricityPresentReading  !== '' ? parseNum(data.electricityPresentReading)  : existing?.presentReading  ?? 0;
  const previousReading = data.electricityPreviousReading !== '' ? parseNum(data.electricityPreviousReading) : existing?.previousReading ?? 0;
  const rate            = data.electricityRate            !== '' ? parseNum(data.electricityRate)            : existing?.rate            ?? 0;
  return {
    mode: existing?.mode ?? 'metered',
    presentReading, previousReading, rate,
    amount: round2(Math.max(0, (presentReading - previousReading) * rate)),
  };
}

function buildWaterUpdate(data: Record<string, string>, existing: Invoice['water']) {
  if (existing?.mode === 'fixed') {
    return { ...existing, ...(data.waterAmount !== '' ? { amount: parseNum(data.waterAmount) } : {}) };
  }
  const presentReading  = data.waterPresentReading  !== '' ? parseNum(data.waterPresentReading)  : existing?.presentReading  ?? 0;
  const previousReading = data.waterPreviousReading !== '' ? parseNum(data.waterPreviousReading) : existing?.previousReading ?? 0;
  const rate            = existing?.rate ?? 0;
  return {
    mode: existing?.mode ?? 'metered',
    presentReading, previousReading, rate,
    amount: round2(Math.max(0, (presentReading - previousReading) * rate)),
  };
}

function validateRow(
  data: Record<string, string>,
  tenants: Tenant[],
  rowNum: number,
  existingByKey: Map<string, Invoice>,
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

  const existing = tenant && month ? existingByKey.get(`${tenant.id}:${month}`) : undefined;
  // Only a draft can have its charges edited (updateInvoice itself enforces this too --
  // see handler.ts:269 -- so a matched non-draft invoice is left alone, not partially applied).
  const action: ParsedRow['action'] = !tenant ? 'create' : !existing ? 'create' : existing.status === 'draft' ? 'update' : 'skip';

  let payload: Record<string, any> | undefined;
  if (errors.length === 0 && tenant && action === 'create') {
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
  } else if (errors.length === 0 && tenant && action === 'update' && existing) {
    const hasElecReading = data.electricityPresentReading || data.electricityPreviousReading;
    const hasWaterReading = data.waterPresentReading || data.waterPreviousReading;
    const touchesElec = hasElecReading || data.electricityRate;
    const touchesWater = (hasWaterReading || data.waterAmount) && existing.water?.mode !== 'direct';

    payload = {
      ...(data.rent         ? { rent: parseNum(data.rent) } : {}),
      ...(data.guard        ? { guard: parseNum(data.guard) } : {}),
      ...(data.discount     ? { discount: parseNum(data.discount) } : {}),
      ...(data.status       ? { status: data.status } : {}),
      ...(touchesElec && existing.electricity?.mode !== 'direct' ? { electricity: buildElectricityUpdate(data, existing.electricity) } : {}),
      ...(touchesWater ? { water: buildWaterUpdate(data, existing.water) } : {}),
    };
  }

  return {
    rowNum, data, errors, action,
    invoiceId: existing?.id, existingStatus: existing?.status,
    tenantId: tenant?.id, lesseeName: tenant?.lesseeName, payload,
  };
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
    downloadCsv('invoices-template.csv', csv);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Map of tenantId:billingMonth -> existing invoice, so a matching draft can be updated
    // instead of just flagged as a duplicate and skipped.
    const existingByKey = new Map(
      invoices.map(inv => [`${inv.tenantId}:${inv.billingMonth}`, inv] as const)
    );
    const text = await readCsvFile(file);
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      toast({ title: 'CSV has no data rows', status: 'warning' });
      return;
    }
    const headers = parsed[0].map(h => h.trim());
    const result = parsed.slice(1).map((cols, i) => {
      const data: Record<string, string> = {};
      headers.forEach((h, j) => { data[h] = cols[j] ?? ''; });
      return validateRow(data, tenants, i + 2, existingByKey);
    });
    setRows(result);
  };

  const errorRows  = rows.filter(r => r.errors.length > 0);
  const skipRows   = rows.filter(r => r.errors.length === 0 && r.action === 'skip');
  const createRows = rows.filter(r => r.errors.length === 0 && r.action === 'create');
  const updateRows = rows.filter(r => r.errors.length === 0 && r.action === 'update');
  const applyRows  = [...createRows, ...updateRows];

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    let createdCount = 0;
    let updatedCount = 0;
    let failCount = 0;
    for (let i = 0; i < applyRows.length; i++) {
      const row = applyRows[i];
      try {
        if (row.action === 'update') {
          await invoiceService.updateInvoice(row.invoiceId!, row.payload!);
          updatedCount++;
        } else {
          await invoiceService.createInvoice(row.payload!);
          createdCount++;
        }
      } catch {
        failCount++;
      }
      setProgress(Math.round(((i + 1) / applyRows.length) * 100));
    }
    setImporting(false);
    toast({
      title: [
        createdCount > 0 ? `${createdCount} created` : '',
        updatedCount > 0 ? `${updatedCount} updated` : '',
        skipRows.length > 0 ? `${skipRows.length} skipped (not draft)` : '',
        failCount > 0 ? `${failCount} failed` : '',
      ].filter(Boolean).join(', ') || 'No invoices processed',
      status: failCount > 0 ? 'warning' : 'success',
    });
    if (createdCount > 0 || updatedCount > 0) {
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
                If a row matches an existing <strong>draft</strong> invoice for that lessee + month, it updates
                that invoice (e.g. filling in a present reading) instead of creating a new one — handy for exporting
                a rolled-over month, filling in meter readings, and re-uploading the same file.
                A row matching an invoice that&apos;s no longer a draft is left untouched.
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
                  <Badge colorScheme="green" px={2} py={1}>{createRows.length} to create</Badge>
                  {updateRows.length > 0 && (
                    <Badge colorScheme="blue" px={2} py={1}>{updateRows.length} to update</Badge>
                  )}
                  {skipRows.length > 0 && (
                    <Badge colorScheme="yellow" px={2} py={1}>{skipRows.length} skipped (not draft)</Badge>
                  )}
                  {errorRows.length > 0 && (
                    <Badge colorScheme="red" px={2} py={1}>{errorRows.length} with errors (skipped)</Badge>
                  )}
                </HStack>

                {skipRows.length > 0 && (
                  <Alert status="info" fontSize="sm">
                    <AlertIcon />
                    These rows match an existing invoice that&apos;s no longer a draft (sent/partial/paid/printed),
                    so they&apos;re left untouched. Edit those directly if they need changes.
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
                          bg={row.errors.length > 0 ? 'red.50' : row.action === 'skip' ? 'yellow.50' : row.action === 'update' ? 'blue.50' : undefined}>
                          <Td>{row.rowNum}</Td>
                          <Td fontFamily="mono" fontSize="xs">{row.data.lesseeNo || '—'}</Td>
                          <Td>{row.lesseeName || '—'}</Td>
                          <Td fontSize="xs">{normalizeBillingMonth(row.data.billingMonth || '') || '—'}</Td>
                          <Td isNumeric>{row.data.rent || '(default)'}</Td>
                          <Td>{row.data.status || 'draft'}</Td>
                          <Td>
                            {row.errors.length > 0
                              ? <Badge colorScheme="red">Error</Badge>
                              : row.action === 'skip'
                              ? <Badge colorScheme="yellow">Skipped ({row.existingStatus})</Badge>
                              : row.action === 'update'
                              ? <Badge colorScheme="blue">Update</Badge>
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
            {rows.length > 0 && (
              <Button colorScheme="blue" onClick={handleImport} isLoading={importing} isDisabled={applyRows.length === 0}>
                {applyRows.length > 0
                  ? `Apply ${applyRows.length} Row${applyRows.length !== 1 ? 's' : ''}` +
                    (createRows.length > 0 && updateRows.length > 0 ? ` (${createRows.length} create, ${updateRows.length} update)` : '')
                  : 'Nothing to Apply'}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
