'use client';
import { useRef, useState, ChangeEvent } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, Text, Box, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Alert, AlertIcon, Progress, useToast, TableContainer,
} from '@chakra-ui/react';
import { Tenant, LedgerChargeInput } from '@/features/invoicing/types';
import { tenantService } from '@/services/tenantService';

const CSV_HEADERS = ['tenantCode', 'billingMonth', 'amount', 'invoiceNumber', 'description'];

const EXAMPLE_ROW = ['T-001', '2024-01', '15000.00', 'INV-2024-01-0001', 'January 2024 rent unpaid'];

// ── helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  return parseFloat((val || '').replace(/,/g, '')) || 0;
}

function normalizeBillingMonth(val: string): string {
  if (!val) return val;
  if (/^\d{4}-\d{2}$/.test(val)) return val;
  const slashMatch = val.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}`;
  }
  return val;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
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
  payload?: LedgerChargeInput;
}

function validateRow(
  data: Record<string, string>,
  tenants: Tenant[],
  seenKeys: Set<string>,
  rowNum: number,
): ParsedRow {
  const errors: string[] = [];

  const tenant = tenants.find(t => t.tenantCode === data.tenantCode);
  if (!data.tenantCode) errors.push('tenantCode required');
  else if (!tenant) errors.push(`Tenant "${data.tenantCode}" not found`);

  const billingMonth = normalizeBillingMonth(data.billingMonth || '');
  if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) {
    errors.push('billingMonth must be YYYY-MM or MM/YYYY');
  } else {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (billingMonth > currentMonth) errors.push('billingMonth cannot be in the future');
  }

  const amount = parseNum(data.amount);
  if (!data.amount || amount <= 0) errors.push('amount must be a positive number');

  if (tenant && errors.length === 0) {
    const dupKey = `${tenant.id}#${billingMonth}`;
    if (seenKeys.has(dupKey)) {
      errors.push('duplicate tenantCode + billingMonth in this file');
    } else {
      seenKeys.add(dupKey);
    }
  }

  let payload: LedgerChargeInput | undefined;
  if (errors.length === 0 && tenant) {
    payload = {
      tenantId: tenant.id,
      billingMonth,
      principalAmount: amount,
      invoiceNumber: data.invoiceNumber || undefined,
      description: data.description || `Imported balance — ${billingMonth}`,
    };
  }

  return { rowNum, data, errors, payload };
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onImported: () => void;
}

export function LedgerCsvUpload({ isOpen, onClose, tenants, onImported }: Props) {
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
    a.download = 'ledger-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast({ title: 'CSV has no data rows', status: 'warning' });
        return;
      }
      const headers = parsed[0].map(h => h.trim());
      const seenKeys = new Set<string>();
      const result = parsed.slice(1).map((cols, i) => {
        const data: Record<string, string> = {};
        headers.forEach((h, j) => { data[h] = cols[j] ?? ''; });
        return validateRow(data, tenants, seenKeys, i + 2);
      });
      setRows(result);
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await tenantService.createLedgerCharge(row.payload!);
        successCount++;
      } catch {
        failCount++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    setImporting(false);
    toast({
      title: `Done: ${successCount} charge${successCount !== 1 ? 's' : ''} imported` +
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
        <ModalHeader>Import Historical Unpaid Balances</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text fontWeight="semibold" mb={1} fontSize="sm">Step 1 — Download the template</Text>
              <Text fontSize="xs" color="gray.600" mb={3}>
                Each row is one unpaid invoice/balance from your old system. <strong>tenantCode</strong> must
                match an existing tenant. <strong>amount</strong> is the outstanding balance still owed.
                Required: tenantCode, billingMonth, amount. Dates should be in <strong>YYYY-MM</strong> or{' '}
                <strong>MM/YYYY</strong> format and cannot be in the future.
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
                  {validRows.length > 0 && <Badge colorScheme="green" px={2} py={1}>{validRows.length} to import</Badge>}
                  {errorRows.length > 0 && <Badge colorScheme="red" px={2} py={1}>{errorRows.length} with errors (skipped)</Badge>}
                </HStack>

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
                        <Th>Tenant Code</Th>
                        <Th>Billing Month</Th>
                        <Th isNumeric>Amount (₱)</Th>
                        <Th>Invoice No.</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rows.map(row => (
                        <Tr key={row.rowNum} bg={row.errors.length > 0 ? 'red.50' : undefined}>
                          <Td>{row.rowNum}</Td>
                          <Td fontFamily="mono" fontSize="xs">{row.data.tenantCode || '—'}</Td>
                          <Td>{row.data.billingMonth || '—'}</Td>
                          <Td isNumeric>{row.data.amount || '—'}</Td>
                          <Td fontSize="xs">{row.data.invoiceNumber || '—'}</Td>
                          <Td>
                            {row.errors.length > 0
                              ? <Badge colorScheme="red">Error</Badge>
                              : <Badge colorScheme="green">OK</Badge>}
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
                        Row {row.rowNum} ({row.data.tenantCode || 'unknown'}): {row.errors.join('; ')}
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
            {validRows.length > 0 && (
              <Button colorScheme="blue" onClick={handleImport} isLoading={importing}>
                Import {validRows.length} Charge{validRows.length !== 1 ? 's' : ''}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
