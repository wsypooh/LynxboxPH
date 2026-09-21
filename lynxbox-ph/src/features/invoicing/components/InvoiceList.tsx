'use client';
import {
  Table, Thead, Tbody, Tfoot, Tr, Th, Td, Badge, Button, IconButton, HStack, Box, Checkbox, Tooltip,
  Menu, MenuButton, MenuList, MenuItem, Text, Select,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FiEye, FiTrash2, FiSlash } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Invoice, InvoiceStatus } from '@/features/invoicing/types';

const LS_KEY      = 'invoice-columns-v2';
const LS_SORT_KEY = 'invoice-sort-v1';
const PAGE_SIZES  = [25, 50, 100];

// ── column definitions ──────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  isNumeric: boolean;
  canSum: boolean;
  defaultOn: boolean;
  cell: (inv: Invoice) => React.ReactNode;
  num: (inv: Invoice) => number;
}

const OPTIONAL: ColDef[] = [
  {
    key: 'buildingName', label: 'Building', isNumeric: false, canSum: false, defaultOn: false,
    cell: inv => <Text fontSize="xs" color="gray.600">{inv.buildingName}</Text>,
    num: () => 0,
  },
  {
    key: 'tenantCode', label: 'Lessee No.', isNumeric: false, canSum: false, defaultOn: true,
    cell: inv => <Text fontFamily="mono" fontSize="xs">{inv.tenantCode}</Text>,
    num: () => 0,
  },
  {
    key: 'rent', label: 'Rent', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => fmt(inv.rent),
    num: inv => inv.rent ?? 0,
  },
  {
    key: 'vat', label: 'VAT', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => fmt(inv.vat),
    num: inv => inv.vat ?? 0,
  },
  {
    key: 'withholdingTax', label: 'Withholding', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => <Text color="red.500">({fmt(Math.abs(inv.withholdingTax ?? 0))})</Text>,
    num: inv => -Math.abs(inv.withholdingTax ?? 0),
  },
  {
    key: 'water', label: 'Water', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => fmt(inv.water?.amount ?? 0),
    num: inv => inv.water?.amount ?? 0,
  },
  {
    key: 'electricity', label: 'Electricity', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => fmt(inv.electricity?.amount ?? 0),
    num: inv => inv.electricity?.amount ?? 0,
  },
  {
    key: 'guard', label: 'Guard', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => fmt(inv.guard ?? 0),
    num: inv => inv.guard ?? 0,
  },
  {
    key: 'otherCharges', label: 'Other Charges', isNumeric: true, canSum: true, defaultOn: false,
    cell: inv => fmt((inv.otherCharges ?? []).reduce((s, c) => s + c.amount, 0)),
    num: inv => (inv.otherCharges ?? []).reduce((s, c) => s + c.amount, 0),
  },
];

const statusColor: Record<InvoiceStatus, string> = {
  draft: 'gray', sent: 'blue', partial: 'orange', paid: 'green', printed: 'purple', void: 'red',
};

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sum(invoices: Invoice[], col: ColDef) {
  return invoices.reduce((acc, inv) => acc + col.num(inv), 0);
}

function exportCsv(invoices: Invoice[]) {
  // Import-compatible headers first, then read-only computed columns
  const fixedHeaders = [
    'lesseeNo', 'billingMonth', 'rent', 'guard', 'discount', 'status',
    'electricityPresentReading', 'electricityPreviousReading', 'electricityRate',
    'waterAmount',
    // read-only / informational
    'invoiceNumber', 'lesseeName', 'buildingName', 'billingLabel',
    'vat', 'withholdingTax', 'totalDue', 'amountPaid', 'outstanding',
  ];
  const rows = invoices.map(inv => [
    inv.tenantCode, inv.billingMonth, inv.rent ?? 0, inv.guard ?? 0, inv.discount ?? 0, inv.status,
    inv.electricity?.presentReading ?? 0, inv.electricity?.previousReading ?? 0, inv.electricity?.rate ?? 0,
    inv.water?.amount ?? 0,
    inv.invoiceNumber, inv.lesseeName, inv.buildingName, inv.billingLabel,
    inv.vat ?? 0, -Math.abs(inv.withholdingTax ?? 0), inv.totalDue, inv.amountPaid, inv.outstanding,
  ].map(v => (typeof v === 'string' && v.includes(',')) ? `"${v}"` : v));
  const csv = [fixedHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── sort ────────────────────────────────────────────────────────────────────────

type SortKey = 'invoiceNumber' | 'lesseeName' | 'buildingName' | 'billingLabel'
  | 'totalDue' | 'amountPaid' | 'outstanding' | 'status'
  | 'tenantCode' | 'rent' | 'vat' | 'withholdingTax' | 'water' | 'electricity' | 'guard' | 'otherCharges';
type SortDir = 'asc' | 'desc';

const SORTABLE_OPTIONAL: SortKey[] = [
  'buildingName', 'tenantCode', 'rent', 'vat', 'withholdingTax', 'water', 'electricity', 'guard', 'otherCharges',
];

function sortInvoices(invoices: Invoice[], key: SortKey, dir: SortDir): Invoice[] {
  return [...invoices].sort((a, b) => {
    let va: string | number, vb: string | number;
    switch (key) {
      case 'invoiceNumber':  va = a.invoiceNumber;   vb = b.invoiceNumber;   break;
      case 'lesseeName':     va = a.lesseeName;      vb = b.lesseeName;      break;
      case 'buildingName':   va = a.buildingName;    vb = b.buildingName;    break;
      case 'billingLabel':   va = a.billingLabel;    vb = b.billingLabel;    break;
      case 'totalDue':       va = a.totalDue;        vb = b.totalDue;        break;
      case 'amountPaid':     va = a.amountPaid;      vb = b.amountPaid;      break;
      case 'outstanding':    va = a.outstanding;     vb = b.outstanding;     break;
      case 'status':         va = a.status;          vb = b.status;          break;
      case 'tenantCode':     va = a.tenantCode;      vb = b.tenantCode;      break;
      case 'rent':           va = a.rent ?? 0;       vb = b.rent ?? 0;       break;
      case 'vat':            va = a.vat ?? 0;        vb = b.vat ?? 0;        break;
      case 'withholdingTax': va = a.withholdingTax ?? 0; vb = b.withholdingTax ?? 0; break;
      case 'water':          va = a.water?.amount ?? 0;  vb = b.water?.amount ?? 0;  break;
      case 'electricity':    va = a.electricity?.amount ?? 0; vb = b.electricity?.amount ?? 0; break;
      case 'guard':          va = a.guard ?? 0;      vb = b.guard ?? 0;      break;
      case 'otherCharges':
        va = (a.otherCharges ?? []).reduce((s, c) => s + c.amount, 0);
        vb = (b.otherCharges ?? []).reduce((s, c) => s + c.amount, 0);
        break;
      default: return 0;
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── component ───────────────────────────────────────────────────────────────────

interface Props {
  invoices: Invoice[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onDelete?: (id: string) => void;
  onVoid?: (id: string) => void;
}

export function InvoiceList({ invoices, selectedIds, onToggle, onToggleAll, onDelete, onVoid }: Props) {
  const router = useRouter();

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return new Set(JSON.parse(stored) as string[]);

    } catch {}
    return new Set(OPTIONAL.filter(c => c.defaultOn).map(c => c.key));
  });

  const [sortKey, setSortKey] = useState<SortKey>(() => {
    try { return (JSON.parse(localStorage.getItem(LS_SORT_KEY) ?? '{}').key ?? 'invoiceNumber') as SortKey; }
    catch { return 'invoiceNumber'; }
  });

  const [sortDir, setSortDir] = useState<SortDir>(() => {
    try { return (JSON.parse(localStorage.getItem(LS_SORT_KEY) ?? '{}').dir ?? 'desc') as SortDir; }
    catch { return 'desc'; }
  });

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage]         = useState(1);

  useEffect(() => { setPage(1); }, [invoices, sortKey, sortDir]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(visibleKeys))); } catch {}
  }, [visibleKeys]);

  useEffect(() => {
    try { localStorage.setItem(LS_SORT_KEY, JSON.stringify({ key: sortKey, dir: sortDir })); } catch {}
  }, [sortKey, sortDir]);

  const toggleCol = (key: string) =>
    setVisibleKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted     = useMemo(() => sortInvoices(invoices, sortKey, sortDir), [invoices, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paged      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const visibleOptional = OPTIONAL.filter(c => visibleKeys.has(c.key));
  const totalCols = 4 + visibleOptional.length + 5;

  const allSelected  = paged.length > 0 && paged.every(inv => selectedIds.has(inv.id));
  const someSelected = paged.some(inv => selectedIds.has(inv.id));

  const from = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to   = Math.min(safePage * pageSize, sorted.length);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? <Text as="span" color="gray.300" ml={1}>↕</Text>
    : sortDir === 'asc' ? <Text as="span" ml={1}>↑</Text>
    : <Text as="span" ml={1}>↓</Text>;

  const SortTh = ({ col, label, isNumeric }: { col: SortKey; label: string; isNumeric?: boolean }) => (
    <Th isNumeric={isNumeric} cursor="pointer" userSelect="none" onClick={() => handleSort(col)}
      _hover={{ bg: 'gray.50' }} whiteSpace="nowrap">
      {label}<SortIcon col={col} />
    </Th>
  );

  return (
    <Box>
      {/* toolbar */}
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color="gray.500">
          {sorted.length === 0
            ? 'No invoices'
            : `Showing ${from}–${to} of ${sorted.length} invoice${sorted.length !== 1 ? 's' : ''}`}
        </Text>
        <HStack>
          <Menu closeOnSelect={false}>
            <MenuButton as={Button} size="xs" variant="outline" rightIcon={<ChevronDownIcon />}>
              Columns
            </MenuButton>
            <MenuList minW="160px" py={1}>
              {OPTIONAL.map(col => (
                <MenuItem key={col.key} onClick={() => toggleCol(col.key)} fontSize="sm" py={1}>
                  <Checkbox isChecked={visibleKeys.has(col.key)} mr={2} pointerEvents="none" size="sm" />
                  {col.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Button size="xs" variant="outline" colorScheme="green" onClick={() => exportCsv(sorted)}>
            Export CSV
          </Button>
        </HStack>
      </HStack>

      {/* table */}
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th w="36px">
                <Checkbox
                  isChecked={allSelected}
                  isIndeterminate={someSelected && !allSelected}
                  onChange={() => onToggleAll(paged.map(i => i.id))}
                />
              </Th>
              <SortTh col="invoiceNumber" label="Invoice #" />
              <SortTh col="lesseeName"   label="Lessee" />
              <SortTh col="billingLabel" label="Period" />
              {visibleOptional.map(col =>
                SORTABLE_OPTIONAL.includes(col.key as SortKey)
                  ? <SortTh key={col.key} col={col.key as SortKey} label={col.label} isNumeric={col.isNumeric} />
                  : <Th key={col.key} isNumeric={col.isNumeric}>{col.label}</Th>
              )}
              <SortTh col="totalDue"    label="Total"       isNumeric />
              <SortTh col="amountPaid"  label="Paid"        isNumeric />
              <SortTh col="outstanding" label="Outstanding" isNumeric />
              <SortTh col="status"      label="Status" />
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paged.map(inv => (
              <Tr
                key={inv.id}
                bg={selectedIds.has(inv.id) ? 'blue.50' : undefined}
                cursor="pointer"
                _hover={{ bg: selectedIds.has(inv.id) ? 'blue.50' : 'gray.50' }}
                onClick={() => router.push(`/dashboard/invoices/detail?id=${inv.id}`)}
              >
                <Td onClick={(e) => e.stopPropagation()}>
                  <Checkbox isChecked={selectedIds.has(inv.id)} onChange={() => onToggle(inv.id)} />
                </Td>
                <Td fontFamily="mono" fontSize="xs">{inv.invoiceNumber}</Td>
                <Td>{inv.lesseeName}</Td>
                <Td>{inv.billingLabel}</Td>
                {visibleOptional.map(col => (
                  <Td key={col.key} isNumeric={col.isNumeric}>{col.cell(inv)}</Td>
                ))}
                <Td isNumeric>{fmt(inv.totalDue)}</Td>
                <Td isNumeric>{fmt(inv.amountPaid)}</Td>
                <Td isNumeric>{fmt(inv.outstanding)}</Td>
                <Td><Badge colorScheme={statusColor[inv.status]}>{inv.status}</Badge></Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <HStack spacing={1}>
                    <Tooltip label="View">
                      <IconButton aria-label="View invoice" icon={<FiEye />} size="xs" variant="outline" onClick={() => router.push(`/dashboard/invoices/detail?id=${inv.id}`)} />
                    </Tooltip>
                    {inv.status === 'draft'
                      ? (onDelete && (
                        <Tooltip label="Delete">
                          <IconButton aria-label="Delete invoice" icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" onClick={() => onDelete(inv.id)} />
                        </Tooltip>
                      ))
                      : (onVoid && inv.status !== 'void' && (
                        <Tooltip label="Void">
                          <IconButton aria-label="Void invoice" icon={<FiSlash />} size="xs" variant="ghost" colorScheme="red" onClick={() => onVoid(inv.id)} />
                        </Tooltip>
                      ))}
                  </HStack>
                </Td>
              </Tr>
            ))}
            {sorted.length === 0 && (
              <Tr><Td colSpan={totalCols} textAlign="center" color="gray.400">No invoices found</Td></Tr>
            )}
          </Tbody>
          {paged.length > 0 && (
            <Tfoot>
              <Tr bg="gray.50" fontWeight="semibold">
                <Td /><Td colSpan={3} fontSize="sm" color="gray.500">
                  Page totals ({paged.length} invoice{paged.length !== 1 ? 's' : ''})
                </Td>
                {visibleOptional.map(col => {
                  if (!col.canSum) return <Td key={col.key} />;
                  const s = sum(paged, col);
                  return (
                    <Td key={col.key} isNumeric fontSize="sm" color={s < 0 ? 'red.500' : undefined}>
                      {s < 0 ? `(${fmt(Math.abs(s))})` : fmt(s)}
                    </Td>
                  );
                })}
                <Td isNumeric fontSize="sm">{fmt(paged.reduce((s, i) => s + i.totalDue, 0))}</Td>
                <Td isNumeric fontSize="sm">{fmt(paged.reduce((s, i) => s + i.amountPaid, 0))}</Td>
                <Td isNumeric fontSize="sm">{fmt(paged.reduce((s, i) => s + i.outstanding, 0))}</Td>
                <Td /><Td />
              </Tr>
            </Tfoot>
          )}
        </Table>
      </Box>

      {/* pager */}
      {sorted.length > 0 && (
        <HStack justify="space-between" mt={3}>
          <HStack spacing={1}>
            <Button size="xs" variant="outline" onClick={() => setPage(1)} isDisabled={safePage === 1}>«</Button>
            <Button size="xs" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={safePage === 1}>‹</Button>
            <Text fontSize="xs" px={2}>Page {safePage} of {totalPages}</Text>
            <Button size="xs" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={safePage === totalPages}>›</Button>
            <Button size="xs" variant="outline" onClick={() => setPage(totalPages)} isDisabled={safePage === totalPages}>»</Button>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="xs" color="gray.500">Rows per page</Text>
            <Select size="xs" w="70px" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </HStack>
        </HStack>
      )}
    </Box>
  );
}
