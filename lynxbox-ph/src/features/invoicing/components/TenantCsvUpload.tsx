'use client';
import { useRef, useState, ChangeEvent } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, Text, Box, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Alert, AlertIcon, Progress, useToast, TableContainer,
} from '@chakra-ui/react';
import { Building, Tenant, TenantInput } from '@/features/invoicing/types';
import { tenantService } from '@/services/tenantService';

const CSV_HEADERS = [
  'buildingName',
  'floor',
  'roomNumber',
  'lesseeNo',
  'lesseeName',
  'area',
  'contactEmail',
  'contactPhone',
  'tin',
  'defaultRent',
  'vatEnabled',
  'withholdingTaxEnabled',
  'electricityMode',
  'waterMode',
  'defaultWaterRate',
  'defaultFixedWater',
  'defaultGuard',
  'penaltyEnabled',
  'status',
  'contractStartDate',
  'contractEndDate',
  'contractRentAmount',
  'contractDeposit',
  'contractNotes',
];

const EXAMPLE_ROW = [
  'My Building', '1F', 'Rm 01', 'T-001', 'Juan dela Cruz', '25',
  'juan@example.com', '09171234567', '123-456-789-000', '15000',
  'false', 'false', 'metered', 'fixed', '', '500', '2000', 'true', 'active',
  '2025-01-01', '2025-12-31', '15000', '30000', '',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  // Strip thousands separators (commas) before parsing
  return parseFloat((val || '').replace(/,/g, '')) || 0;
}

function normalizeDate(val: string): string {
  if (!val) return val;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // M/D/YYYY or MM/DD/YYYY
  const slashMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // M-D-YYYY or MM-DD-YYYY (non-ISO separators)
  const dashMatch = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, m, d, y] = dashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
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
  action: 'create' | 'update';
  existingId?: string;
  payload?: TenantInput;
  contractToAppend?: { startDate: string; endDate: string; rentAmount: number; deposit: number; notes?: string };
}

function validateRow(
  data: Record<string, string>,
  buildings: Building[],
  existingTenants: Tenant[],
  rowNum: number,
): ParsedRow {
  const errors: string[] = [];

  if (!data.buildingName) errors.push('buildingName required');
  if (!data.floor)        errors.push('floor required');
  if (!data.roomNumber)   errors.push('roomNumber required');
  if (!data.lesseeName)   errors.push('lesseeName required');
  if (!data.defaultRent)  errors.push('defaultRent required');

  const building = buildings.find(b => b.name.toLowerCase() === (data.buildingName || '').toLowerCase());
  if (data.buildingName && !building) errors.push(`Building "${data.buildingName}" not found`);

  const rentRaw = (data.defaultRent || '').replace(/,/g, '');
  if (data.defaultRent && isNaN(parseFloat(rentRaw))) errors.push('defaultRent must be a number');
  if (data.area && isNaN(parseFloat((data.area || '').replace(/,/g, '')))) errors.push('area must be a number');
  if (data.electricityMode && !['metered', 'direct'].includes(data.electricityMode))
    errors.push('electricityMode: metered or direct');
  if (data.waterMode && !['metered', 'fixed', 'direct'].includes(data.waterMode))
    errors.push('waterMode: metered, fixed, or direct');
  if (data.status && !['active', 'inactive'].includes(data.status))
    errors.push('status: active or inactive');

  // Determine create vs update based on lesseeNo match
  const existing = data.lesseeNo
    ? existingTenants.find(t => t.tenantCode === data.lesseeNo)
    : undefined;
  const action: 'create' | 'update' = existing ? 'update' : 'create';

  let payload: TenantInput | undefined;
  let contractToAppend: ParsedRow['contractToAppend'];

  if (errors.length === 0 && building) {
    const hasContract = !!(data.contractStartDate && data.contractEndDate);
    const contract = hasContract ? {
      startDate: normalizeDate(data.contractStartDate),
      endDate: normalizeDate(data.contractEndDate),
      rentAmount: parseNum(data.contractRentAmount) || parseNum(data.defaultRent),
      deposit: parseNum(data.contractDeposit),
      notes: data.contractNotes || undefined,
    } : undefined;

    payload = {
      buildingId: building.id,
      floor: data.floor,
      roomNumber: data.roomNumber,
      tenantCode: data.lesseeNo || undefined,
      lesseeName: data.lesseeName,
      area: parseNum(data.area),
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      tin: data.tin || undefined,
      defaultRent: parseNum(data.defaultRent),
      vatEnabled: data.vatEnabled?.toLowerCase() === 'true',
      withholdingTaxEnabled: data.withholdingTaxEnabled?.toLowerCase() === 'true',
      electricityMode: (data.electricityMode as 'metered' | 'direct') || 'metered',
      waterMode: (data.waterMode as 'metered' | 'fixed' | 'direct') || 'fixed',
      defaultWaterRate: data.defaultWaterRate ? parseNum(data.defaultWaterRate) : undefined,
      defaultFixedWater: data.defaultFixedWater ? parseNum(data.defaultFixedWater) : undefined,
      defaultGuard: data.defaultGuard ? parseNum(data.defaultGuard) : undefined,
      penaltyEnabled: data.penaltyEnabled ? data.penaltyEnabled.toLowerCase() !== 'false' : true,
      status: (data.status as 'active' | 'inactive') || 'active',
      // On create: embed contract. On update: append separately to preserve history.
      contracts: action === 'create' && contract ? [contract] : [],
    };

    if (action === 'update' && contract) {
      contractToAppend = contract;
    }
  }

  return { rowNum, data, errors, action, existingId: existing?.id, payload, contractToAppend };
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  buildings: Building[];
  tenants: Tenant[];
  onImported: () => void;
}

export function TenantCsvUpload({ isOpen, onClose, buildings, tenants, onImported }: Props) {
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
    a.download = 'tenants-template.csv';
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
      const result = parsed.slice(1).map((cols, i) => {
        const data: Record<string, string> = {};
        headers.forEach((h, j) => { data[h] = cols[j] ?? ''; });
        return validateRow(data, buildings, tenants, i + 2);
      });
      setRows(result);
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows  = rows.filter(r => r.errors.length > 0);
  const toCreate   = validRows.filter(r => r.action === 'create');
  const toUpdate   = validRows.filter(r => r.action === 'update');

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        if (row.action === 'update' && row.existingId) {
          await tenantService.updateTenant(row.existingId, row.payload!);
          if (row.contractToAppend) {
            await tenantService.renewContract(row.existingId, row.contractToAppend);
          }
        } else {
          await tenantService.createTenant(row.payload!);
        }
        successCount++;
      } catch {
        failCount++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    setImporting(false);
    toast({
      title: `Done: ${successCount} tenant${successCount !== 1 ? 's' : ''} processed` +
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
        <ModalHeader>Import Tenants from CSV</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text fontWeight="semibold" mb={1} fontSize="sm">Step 1 — Download the template</Text>
              <Text fontSize="xs" color="gray.600" mb={3}>
                Fill in the template with your tenant data. <strong>buildingName</strong> must match an existing building.
                Required: buildingName, floor, roomNumber, lesseeName, defaultRent.
                If <strong>lesseeNo</strong> matches an existing record, it will be updated instead of created.
                Dates should be in <strong>YYYY-MM-DD</strong> or <strong>M/D/YYYY</strong> format.
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
                  {toCreate.length > 0 && <Badge colorScheme="green" px={2} py={1}>{toCreate.length} to create</Badge>}
                  {toUpdate.length > 0 && <Badge colorScheme="blue"  px={2} py={1}>{toUpdate.length} to update</Badge>}
                  {errorRows.length > 0 && <Badge colorScheme="red"  px={2} py={1}>{errorRows.length} with errors (skipped)</Badge>}
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
                        <Th>Lessee No.</Th>
                        <Th>Building</Th>
                        <Th>Floor / Room</Th>
                        <Th>Lessee Name</Th>
                        <Th isNumeric>Rent (₱)</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rows.map(row => (
                        <Tr key={row.rowNum} bg={row.errors.length > 0 ? 'red.50' : undefined}>
                          <Td>{row.rowNum}</Td>
                          <Td fontFamily="mono" fontSize="xs">{row.data.lesseeNo || '—'}</Td>
                          <Td>{row.data.buildingName || '—'}</Td>
                          <Td fontSize="xs">{row.data.floor || '—'} {row.data.roomNumber || ''}</Td>
                          <Td>{row.data.lesseeName || '—'}</Td>
                          <Td isNumeric>{row.data.defaultRent || '—'}</Td>
                          <Td>
                            {row.errors.length > 0
                              ? <Badge colorScheme="red">Error</Badge>
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
                        Row {row.rowNum} ({row.data.lesseeName || 'unnamed'}): {row.errors.join('; ')}
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
                {toCreate.length > 0 && toUpdate.length > 0
                  ? `Import (${toCreate.length} create, ${toUpdate.length} update)`
                  : toUpdate.length > 0
                  ? `Update ${toUpdate.length} Tenant${toUpdate.length !== 1 ? 's' : ''}`
                  : `Create ${toCreate.length} Tenant${toCreate.length !== 1 ? 's' : ''}`}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
