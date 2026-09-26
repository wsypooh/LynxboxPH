'use client';
import {
  Table, Thead, Tbody, Tr, Th, Td, Badge, Button, IconButton, HStack, Box, Text, Tooltip,
  Menu, MenuButton, MenuList, MenuItem, Checkbox, Select,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { MdReceipt } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Tenant, Building } from '@/features/invoicing/types';
import { useAccount } from '@/features/account/AccountContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanGatedButton } from '@/components/PlanGatedButton';

const LS_COL_KEY  = 'tenant-columns-v2';
const LS_SORT_KEY = 'tenant-sort-v1';
const PAGE_SIZES  = [25, 50, 100];

// ── helpers ────────────────────────────────────────────────────────────────────

function getLeaseEndDate(t: Tenant): string | null {
  if (!t.contracts?.length) return null;
  return t.contracts[t.contracts.length - 1].endDate;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function fmt(n: number) {
  return `₱${(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function exportCsv(tenants: Tenant[], buildings: Building[]) {
  // Headers match the import template exactly so the file can be re-imported
  const headers = [
    'buildingName', 'floor', 'roomNumber', 'lesseeNo', 'lesseeName', 'area',
    'contactEmail', 'contactPhone', 'tin', 'defaultRent',
    'vatEnabled', 'withholdingTaxEnabled', 'electricityMode', 'waterMode',
    'defaultWaterRate', 'defaultFixedWater', 'defaultGuard', 'penaltyEnabled', 'status',
    'contractStartDate', 'contractEndDate', 'contractRentAmount', 'contractDeposit', 'contractNotes',
  ];
  const rows = tenants.map(t => {
    const bldg = buildings.find(b => b.id === t.buildingId)?.name ?? t.buildingId;
    const c = t.contracts?.length ? t.contracts[t.contracts.length - 1] : null;
    return [
      bldg, t.floor, t.roomNumber, t.tenantCode, t.lesseeName, t.area ?? '',
      t.contactEmail ?? '', t.contactPhone ?? '', t.tin ?? '',
      t.defaultRent, t.vatEnabled, t.withholdingTaxEnabled,
      t.electricityMode, t.waterMode,
      t.defaultWaterRate ?? '', t.defaultFixedWater ?? '', t.defaultGuard ?? '',
      t.penaltyEnabled ?? true,
      t.status,
      c?.startDate ?? '', c?.endDate ?? '', c?.rentAmount ?? '', c?.deposit ?? '', c?.notes ?? '',
    ].map(v => (typeof v === 'string' && v.includes(',')) ? `"${v}"` : v);
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── column definitions ──────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  defaultOn: boolean;
  isNumeric?: boolean;
  cell: (t: Tenant, buildings: Building[]) => React.ReactNode;
}

const OPTIONAL: ColDef[] = [
  {
    key: 'building', label: 'Building', defaultOn: false,
    cell: (t, buildings) => (
      <Text fontSize="xs" color="gray.600">
        {buildings.find(b => b.id === t.buildingId)?.name ?? t.buildingId}
      </Text>
    ),
  },
  {
    key: 'leaseStart', label: 'Lease Start', defaultOn: false,
    cell: (t) => {
      const start = t.contracts?.length ? t.contracts[t.contracts.length - 1].startDate : null;
      return <Text fontSize="xs">{start || '—'}</Text>;
    },
  },
  {
    key: 'leaseEnd', label: 'Lease End', defaultOn: true,
    cell: (t) => {
      const end = getLeaseEndDate(t);
      if (!end) return <Text color="gray.400" fontSize="xs">—</Text>;
      const days = daysUntil(end);
      return (
        <HStack spacing={1}>
          <Text fontSize="xs">{end}</Text>
          {days <= 30 && (
            <Badge colorScheme={days <= 7 ? 'red' : 'orange'} fontSize="xs">{days}d</Badge>
          )}
        </HStack>
      );
    },
  },
  {
    key: 'defaultRent', label: 'Default Rent', defaultOn: true, isNumeric: true,
    cell: (t) => <Text>{fmt(t.defaultRent)}</Text>,
  },
  {
    key: 'area', label: 'Area (sqm)', defaultOn: false, isNumeric: true,
    cell: (t) => <Text>{t.area || '—'}</Text>,
  },
  {
    key: 'contactEmail', label: 'Email', defaultOn: false,
    cell: (t) => <Text fontSize="xs">{t.contactEmail || '—'}</Text>,
  },
  {
    key: 'contactPhone', label: 'Phone', defaultOn: false,
    cell: (t) => <Text fontSize="xs">{t.contactPhone || '—'}</Text>,
  },
  {
    key: 'tin', label: 'TIN', defaultOn: false,
    cell: (t) => <Text fontSize="xs">{t.tin || '—'}</Text>,
  },
  {
    key: 'electricityMode', label: 'Electricity', defaultOn: false,
    cell: (t) => <Badge variant="outline" fontSize="xs">{t.electricityMode}</Badge>,
  },
  {
    key: 'waterMode', label: 'Water', defaultOn: false,
    cell: (t) => <Badge variant="outline" fontSize="xs">{t.waterMode}</Badge>,
  },
];

// ── sort ────────────────────────────────────────────────────────────────────────

type SortKey = 'tenantCode' | 'lesseeName' | 'unit' | 'status'
  | 'building' | 'leaseStart' | 'leaseEnd' | 'defaultRent' | 'area';
type SortDir = 'asc' | 'desc';

const SORTABLE_OPTIONAL: SortKey[] = ['building', 'leaseStart', 'leaseEnd', 'defaultRent', 'area'];

function sortTenants(tenants: Tenant[], key: SortKey, dir: SortDir, buildings: Building[] = []): Tenant[] {
  return [...tenants].sort((a, b) => {
    let va: string | number, vb: string | number;
    switch (key) {
      case 'tenantCode':  va = a.tenantCode;  vb = b.tenantCode;  break;
      case 'lesseeName':  va = a.lesseeName;  vb = b.lesseeName;  break;
      case 'unit':        va = `${a.floor} ${a.roomNumber}`; vb = `${b.floor} ${b.roomNumber}`; break;
      case 'status':      va = a.status;      vb = b.status;      break;
      case 'building':
        va = buildings.find(bl => bl.id === a.buildingId)?.name ?? '';
        vb = buildings.find(bl => bl.id === b.buildingId)?.name ?? '';
        break;
      case 'leaseStart':
        va = a.contracts?.length ? a.contracts[a.contracts.length - 1].startDate : '';
        vb = b.contracts?.length ? b.contracts[b.contracts.length - 1].startDate : '';
        break;
      case 'leaseEnd':    va = getLeaseEndDate(a) ?? ''; vb = getLeaseEndDate(b) ?? ''; break;
      case 'defaultRent': va = a.defaultRent; vb = b.defaultRent; break;
      case 'area':        va = a.area ?? 0;   vb = b.area ?? 0;   break;
      default: return 0;
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── component ───────────────────────────────────────────────────────────────────

interface Props {
  tenants: Tenant[];
  buildings: Building[];
  onEdit: (tenant: Tenant) => void;
  onDelete: (id: string) => void;
}

export function TenantList({ tenants, buildings, onEdit, onDelete }: Props) {
  const router = useRouter();
  const { canWrite, canDestroy } = useAccount();
  const planLimits = usePlanLimits();
  const dataExportEnabled = planLimits?.dataExportEnabled ?? true;

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LS_COL_KEY);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {}
    return new Set(OPTIONAL.filter(c => c.defaultOn).map(c => c.key));
  });

  const [sortKey, setSortKey] = useState<SortKey>(() => {
    try { return (JSON.parse(localStorage.getItem(LS_SORT_KEY) ?? '{}').key ?? 'tenantCode') as SortKey; }
    catch { return 'tenantCode'; }
  });

  const [sortDir, setSortDir] = useState<SortDir>(() => {
    try { return (JSON.parse(localStorage.getItem(LS_SORT_KEY) ?? '{}').dir ?? 'asc') as SortDir; }
    catch { return 'asc'; }
  });

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage]         = useState(1);

  // Reset to page 1 whenever the data or sort changes
  useEffect(() => { setPage(1); }, [tenants, sortKey, sortDir]);

  useEffect(() => {
    try { localStorage.setItem(LS_COL_KEY, JSON.stringify(Array.from(visibleKeys))); } catch {}
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

  const sorted   = useMemo(() => sortTenants(tenants, sortKey, sortDir, buildings), [tenants, buildings, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paged      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const visibleOptional = OPTIONAL.filter(c => visibleKeys.has(c.key));
  const totalCols = 4 + visibleOptional.length + 1;

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

  const from = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to   = Math.min(safePage * pageSize, sorted.length);

  return (
    <Box>
      {/* toolbar */}
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color="gray.500">
          {sorted.length === 0
            ? 'No tenants'
            : `Showing ${from}–${to} of ${sorted.length} tenant${sorted.length !== 1 ? 's' : ''}`}
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
          <PlanGatedButton
            size="xs"
            variant="outline"
            colorScheme="green"
            enabled={dataExportEnabled}
            upgradeMessage="CSV export is available on Starter, Growth, and Business plans."
            onClick={() => exportCsv(sorted, buildings)}
          >
            Export CSV
          </PlanGatedButton>
        </HStack>
      </HStack>

      {/* table */}
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <SortTh col="tenantCode" label="Lessee No." />
              <SortTh col="lesseeName" label="Lessee" />
              <SortTh col="unit"       label="Unit" />
              <SortTh col="status"     label="Status" />
              {visibleOptional.map(c =>
                SORTABLE_OPTIONAL.includes(c.key as SortKey)
                  ? <SortTh key={c.key} col={c.key as SortKey} label={c.label} isNumeric={c.isNumeric} />
                  : <Th key={c.key} isNumeric={c.isNumeric}>{c.label}</Th>
              )}
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paged.map(t => (
              <Tr
                key={t.id}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                onClick={() => router.push(`/dashboard/tenants/detail?id=${t.id}`)}
              >
                <Td fontFamily="mono" fontSize="xs">{t.tenantCode}</Td>
                <Td>{t.lesseeName}</Td>
                <Td fontSize="xs">{t.floor} {t.roomNumber}</Td>
                <Td>
                  <Badge colorScheme={t.status === 'active' ? 'green' : 'gray'}>{t.status}</Badge>
                </Td>
                {visibleOptional.map(c => (
                  <Td key={c.key} isNumeric={c.isNumeric}>{c.cell(t, buildings)}</Td>
                ))}
                <Td onClick={(e) => e.stopPropagation()}>
                  <HStack spacing={1}>
                    <Tooltip label="View">
                      <IconButton aria-label="View tenant" icon={<FiEye />} size="xs" variant="outline" onClick={() => router.push(`/dashboard/tenants/detail?id=${t.id}`)} />
                    </Tooltip>
                    {canWrite && (
                      <Tooltip label="Edit">
                        <IconButton aria-label="Edit tenant" icon={<FiEdit2 />} size="xs" variant="outline" onClick={() => onEdit(t)} />
                      </Tooltip>
                    )}
                    <Tooltip label="Invoices">
                      <IconButton aria-label="View invoices" icon={<MdReceipt />} size="xs" variant="outline" colorScheme="blue" onClick={() => router.push(`/dashboard/invoices?tenantId=${t.id}`)} />
                    </Tooltip>
                    {canDestroy && (
                      <Tooltip label="Delete">
                        <IconButton aria-label="Delete tenant" icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" onClick={() => onDelete(t.id)} />
                      </Tooltip>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
            {sorted.length === 0 && (
              <Tr><Td colSpan={totalCols} textAlign="center" color="gray.400">No tenants found</Td></Tr>
            )}
          </Tbody>
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
