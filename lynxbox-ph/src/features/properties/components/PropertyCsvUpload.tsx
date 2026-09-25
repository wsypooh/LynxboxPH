'use client';
import { useRef, useState, ChangeEvent } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, VStack, HStack, Text, Box, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Alert, AlertIcon, Progress, useToast, TableContainer,
} from '@chakra-ui/react';
import { Property, PropertyInput, propertyService } from '@/services/propertyService';
import { PH_PROVINCES, getCitiesForProvince } from '@/data/philippineLocations';
import { billingService } from '@/services/billingService';

const CSV_HEADERS = [
  'propertyNumber',
  'title',
  'description',
  'type',
  'price',
  'currency',
  'address',
  'city',
  'province',
  'area',
  'parking',
  'floors',
  'furnished',
  'aircon',
  'wifi',
  'security',
  'contactName',
  'contactEmail',
  'contactPhone',
  'status',
];

const EXAMPLE_ROW = [
  '', 'Prime Office Space in Makati', 'Fully furnished 2-floor office unit ready for occupancy.',
  'office', '45000', 'PHP', '123 Ayala Ave', 'Makati City', 'Metro Manila', '85', '2', '3',
  'true', 'true', 'true', 'true', 'Juan dela Cruz', 'juan@example.com', '09171234567', 'draft',
];

// Quotes a CSV field per RFC 4180 whenever it contains a comma, quote, or newline — needed
// because a plain `.join(',')` (what this previously did) silently corrupts the column count
// the moment any real title/description/address contains a comma of its own.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(fields: string[]): string {
  return fields.map(csvField).join(',');
}

// Same rule PropertyForm.tsx's zod schema enforces — kept identical so imported rows pass
// the same bar a manually-typed listing would.
const PHONE_PATTERN = /^[+\d][\d\s\-()\\.]{6,18}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROPERTY_TYPES = ['office', 'retail', 'warehouse', 'industrial', 'land'];
// 'unlisted' is deliberately excluded — system-set only (docs/Pricing-Strategy-Plan.md's
// downgrade reconciliation), never something an import should be able to set.
const PROPERTY_STATUSES = ['available', 'rented', 'sold', 'maintenance', 'draft'];

// ── helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  return parseFloat((val || '').replace(/,/g, '')) || 0;
}

function parseBool(val: string): boolean {
  return (val || '').trim().toLowerCase() === 'true';
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
  payload?: PropertyInput;
  // True when this row would make a listing newly count against the plan's active-listing
  // cap (a brand-new 'available' row, or an update that publishes something that wasn't
  // already available) — used for the pre-import capacity check, see flagOverCapRows().
  willBeNewlyAvailable?: boolean;
}

function validateRow(
  data: Record<string, string>,
  existingProperties: Property[],
  rowNum: number,
): ParsedRow {
  const errors: string[] = [];

  if (!data.title) errors.push('title required');
  if (!data.description) errors.push('description required');
  if (!data.type) errors.push('type required');
  if (!data.price) errors.push('price required');
  if (!data.address) errors.push('address required');
  if (!data.city) errors.push('city required');
  if (!data.province) errors.push('province required');
  if (!data.area) errors.push('area required');
  if (!data.contactName) errors.push('contactName required');
  if (!data.contactEmail) errors.push('contactEmail required');
  if (!data.contactPhone) errors.push('contactPhone required');

  if (data.type && !PROPERTY_TYPES.includes(data.type)) {
    errors.push(`type must be one of: ${PROPERTY_TYPES.join(', ')}`);
  }
  if (data.price && isNaN(parseFloat((data.price || '').replace(/,/g, '')))) errors.push('price must be a number');
  if (data.area && isNaN(parseFloat((data.area || '').replace(/,/g, '')))) errors.push('area must be a number');
  if (data.contactEmail && !EMAIL_PATTERN.test(data.contactEmail)) errors.push('contactEmail is not a valid email');
  if (data.contactPhone && !PHONE_PATTERN.test(data.contactPhone)) errors.push('contactPhone is not a valid phone number');
  if (data.status && !PROPERTY_STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${PROPERTY_STATUSES.join(', ')} ("unlisted" is system-assigned only)`);
  }

  // Province/city must match the canonical PSGC list (same one PropertyForm.tsx's cascading
  // selects enforce) — checked case-insensitively, normalized to the canonical casing, so a
  // bulk import can't reintroduce the free-text spelling drift that feature was built to stop.
  let canonicalProvince = '';
  let canonicalCity = '';
  if (data.province) {
    canonicalProvince = PH_PROVINCES.find(p => p.toLowerCase() === data.province.toLowerCase()) || '';
    if (!canonicalProvince) errors.push(`province "${data.province}" not recognized`);
  }
  if (data.city && canonicalProvince) {
    const cities = getCitiesForProvince(canonicalProvince);
    canonicalCity = cities.find(c => c.toLowerCase() === data.city.toLowerCase()) || '';
    if (!canonicalCity) errors.push(`city "${data.city}" not found in ${canonicalProvince}`);
  }

  // Match for update by propertyNumber (e.g. "LB-00000123") — same "explicit business
  // identifier decides create vs. update" convention as TenantCsvUpload's lesseeNo match.
  const existing = data.propertyNumber
    ? existingProperties.find(p => p.propertyNumber?.toLowerCase() === data.propertyNumber.toLowerCase())
    : undefined;
  const action: 'create' | 'update' = existing ? 'update' : 'create';

  // Create defaults to 'draft' (no photos yet — see below). Update only touches status when
  // the row explicitly sets one; a blank status column never changes an existing listing's
  // current status just because the row was included for some other field's update.
  const resolvedStatus = action === 'create' ? (data.status || 'draft') : data.status || undefined;
  const willBeNewlyAvailable = resolvedStatus === 'available' && existing?.status !== 'available';

  let payload: PropertyInput | undefined;

  if (errors.length === 0) {
    payload = {
      ...(action === 'create' && { id: crypto.randomUUID() }),
      title: data.title,
      description: data.description,
      type: data.type as PropertyInput['type'],
      price: parseNum(data.price),
      currency: data.currency || 'PHP',
      location: {
        address: data.address,
        city: canonicalCity,
        province: canonicalProvince,
      },
      features: {
        area: parseNum(data.area),
        parking: data.parking ? parseNum(data.parking) : 0,
        floors: data.floors ? parseNum(data.floors) : 0,
        furnished: parseBool(data.furnished),
        aircon: parseBool(data.aircon),
        wifi: parseBool(data.wifi),
        security: parseBool(data.security),
      },
      contactInfo: {
        name: data.contactName,
        email: data.contactEmail,
        phone: data.contactPhone,
      },
      // Images can't travel through a CSV — every imported listing starts with none.
      // On update, `images` is deliberately omitted so an existing listing's photos are
      // never wiped out by a CSV-driven update.
      ...(action === 'create' && { images: [] }),
      ...(resolvedStatus !== undefined && { status: resolvedStatus as PropertyInput['status'] }),
    };
  }

  return { rowNum, data, errors, action, existingId: existing?.id, payload, willBeNewlyAvailable };
}

// Flags rows that would push the account's active-listing count past its plan's cap — a
// second pass over already-validated rows (rather than folded into validateRow itself) since
// it needs the plan limit and current usage, fetched once for the whole file rather than
// per-row. Mirrors the backend's own enforcement (PropertyHandler.createProperty/updateProperty)
// so this is caught in the preview instead of surfacing as scattered import-time failures.
function flagOverCapRows(rows: ParsedRow[], currentActiveCount: number, maxProperties: number): ParsedRow[] {
  if (maxProperties === Infinity) return rows;
  let runningCount = currentActiveCount;
  return rows.map(row => {
    if (row.errors.length > 0 || !row.willBeNewlyAvailable) return row;
    runningCount++;
    if (runningCount > maxProperties) {
      return {
        ...row,
        errors: [...row.errors, `would exceed your plan's active listing limit (${maxProperties}) — import as draft instead, or upgrade your plan`],
      };
    }
    return row;
  });
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingProperties: Property[];
  onImported: () => void;
}

export function PropertyCsvUpload({ isOpen, onClose, existingProperties, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const downloadTemplate = () => {
    const csv = [toCsvRow(CSV_HEADERS), toCsvRow(EXAMPLE_ROW)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'properties-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
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
        return validateRow(data, existingProperties, i + 2);
      });

      try {
        const usage = await billingService.getUsage();
        setRows(flagOverCapRows(result, usage.usage.properties, usage.limits.maxProperties));
      } catch {
        // Can't pre-check without knowing the plan limit — the backend still enforces it
        // for real at import time, this is just a best-effort earlier warning.
        setRows(result);
      }
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
          await propertyService.updateProperty(row.existingId, row.payload!);
        } else {
          await propertyService.createProperty(row.payload!);
        }
        successCount++;
      } catch {
        failCount++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    setImporting(false);
    toast({
      title: `Done: ${successCount} propert${successCount !== 1 ? 'ies' : 'y'} processed` +
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
        <ModalHeader>Import Properties from CSV</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text fontWeight="semibold" mb={1} fontSize="sm">Step 1 — Download the template</Text>
              <Text fontSize="xs" color="gray.600" mb={3}>
                Fill in the template with your listing data. <strong>city</strong>/<strong>province</strong> must
                match real Philippine locations. Required: title, description, type, price, address, city,
                province, area, contactName, contactEmail, contactPhone.
                If <strong>propertyNumber</strong> (e.g. LB-00000123) matches an existing listing, it will be
                updated instead of created — existing photos are kept either way, and a blank
                <strong>status</strong> column never changes an existing listing&apos;s current status.
                Leave <strong>status</strong> blank on a new row (or set it to <code>draft</code>) to import
                it privately — recommended, since it has no photos yet — then add photos and publish it from
                the listing&apos;s edit page when ready. Setting <strong>status</strong> to <code>available</code>
                imports it live immediately; if that would exceed your plan&apos;s active listing limit, the
                row is flagged below instead of being imported.
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
                        <Th>Property #</Th>
                        <Th>Title</Th>
                        <Th>Type</Th>
                        <Th>Status</Th>
                        <Th>City</Th>
                        <Th isNumeric>Price (₱)</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rows.map(row => (
                        <Tr key={row.rowNum} bg={row.errors.length > 0 ? 'red.50' : undefined}>
                          <Td>{row.rowNum}</Td>
                          <Td fontFamily="mono" fontSize="xs">{row.data.propertyNumber || '—'}</Td>
                          <Td fontSize="xs">{row.data.title || '—'}</Td>
                          <Td fontSize="xs">{row.data.type || '—'}</Td>
                          <Td fontSize="xs">{row.data.status || (row.action === 'create' ? 'draft' : '—')}</Td>
                          <Td fontSize="xs">{row.data.city || '—'}</Td>
                          <Td isNumeric>{row.data.price || '—'}</Td>
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
                        Row {row.rowNum} ({row.data.title || 'untitled'}): {row.errors.join('; ')}
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
                  ? `Update ${toUpdate.length} Propert${toUpdate.length !== 1 ? 'ies' : 'y'}`
                  : `Create ${toCreate.length} Propert${toCreate.length !== 1 ? 'ies' : 'y'}`}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
