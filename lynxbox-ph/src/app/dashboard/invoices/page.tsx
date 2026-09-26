'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Heading, Button, HStack, Select, Input, useToast, Spinner, Text,
  Menu, MenuButton, MenuList, MenuItem, MenuDivider,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { invoiceService } from '@/services/invoiceService';
import { buildingService } from '@/services/buildingService';
import { tenantService } from '@/services/tenantService';
import { InvoiceList } from '@/features/invoicing/components/InvoiceList';
import { InvoiceCsvUpload } from '@/features/invoicing/components/InvoiceCsvUpload';
import { Invoice, Building, Tenant } from '@/features/invoicing/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanGatedButton } from '@/components/PlanGatedButton';

const FILTERS_KEY = 'invoices-filters-v1';

function loadStoredFilters(): { month: string; status: string; building: string; lessee: string } {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    return { month: defaultMonth, status: '', building: '', lessee: '', ...JSON.parse(localStorage.getItem(FILTERS_KEY) ?? '{}') };
  } catch {
    return { month: defaultMonth, status: '', building: '', lessee: '' };
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => loadStoredFilters().month);
  const [filterStatus, setFilterStatus] = useState(() => loadStoredFilters().status);
  const [filterBuilding, setFilterBuilding] = useState(() => loadStoredFilters().building);
  const [filterLessee, setFilterLessee] = useState(() => loadStoredFilters().lessee);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planLimits = usePlanLimits();
  const dataImportEnabled = planLimits?.dataImportEnabled ?? true;

  const loadData = async () => {
    try {
      const tenantId = searchParams.get('tenantId') || undefined;
      const filters: Record<string, string> = {};
      if (filterMonth) filters.billingMonth = filterMonth;
      if (filterStatus) filters.status = filterStatus;
      if (tenantId) filters.tenantId = tenantId;
      const [invs, bldgs, tnts] = await Promise.all([
        invoiceService.listInvoices(filters),
        buildingService.listBuildings(),
        tenantService.listTenants(),
      ]);
      setInvoices(invs);
      setBuildings(bldgs);
      setTenants(tnts);
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Failed to load invoices', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterMonth, filterStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        month: filterMonth, status: filterStatus, building: filterBuilding, lessee: filterLessee,
      }));
    } catch {}
  }, [filterMonth, filterStatus, filterBuilding, filterLessee]);

  const filtered = useMemo(() => {
    let result = filterBuilding ? invoices.filter(inv => inv.buildingId === filterBuilding) : invoices;
    if (filterLessee.trim()) {
      const q = filterLessee.trim().toLowerCase();
      result = result.filter(inv =>
        inv.lesseeName?.toLowerCase().includes(q) ||
        inv.tenantCode?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, filterBuilding, filterLessee]);

  const selectedInvoices = useMemo(() =>
    filtered.filter(inv => selectedIds.has(inv.id)),
    [filtered, selectedIds]
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await invoiceService.deleteInvoice(id);
      toast({ title: 'Invoice deleted', status: 'info' });
      await loadData();
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Void this invoice? It will be excluded from balances but kept on record.')) return;
    try {
      await invoiceService.voidInvoice(id);
      toast({ title: 'Invoice voided', status: 'info' });
      await loadData();
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedInvoices.length === 0) return;
    setBulkLoading(true);
    try {
      await invoiceService.downloadSelectedPdf(selectedInvoices.map(inv => inv.id));
    } catch (err: any) {
      toast({ title: err.message || 'Download failed', status: 'error' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMarkPrinted = async () => {
    if (selectedInvoices.length === 0) return;
    if (!confirm(`Mark ${selectedInvoices.length} invoice(s) as printed? They will be locked from editing.`)) return;
    setBulkLoading(true);
    try {
      const updated = await Promise.all(selectedInvoices.map(inv => invoiceService.markAsPrinted(inv.id)));
      const updatedMap = new Map(updated.map(inv => [inv.id, inv]));
      setInvoices(prev => prev.map(inv => updatedMap.get(inv.id) ?? inv));
      setSelectedIds(new Set());
      toast({ title: `${selectedInvoices.length} invoice(s) marked as printed`, status: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Failed to mark as printed', status: 'error' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRolloverSelected = async () => {
    if (selectedInvoices.length === 0) return;
    if (!confirm(`Rollover ${selectedInvoices.length} invoice(s) to next month?`)) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const inv of selectedInvoices) {
        try {
          const draft = await invoiceService.rolloverInvoice(inv.id);
          await invoiceService.createInvoice(draft);
          succeeded++;
        } catch {
          failed++;
        }
      }
      toast({
        title: `${succeeded} invoice(s) rolled over${failed > 0 ? `, ${failed} failed` : ''}`,
        status: failed > 0 ? 'warning' : 'success',
      });
      await loadData();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleAll = (ids: string[]) => {
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <HStack>
          <Heading size="lg">Invoices</Heading>
          {selectedIds.size > 0 && (
            <Text fontSize="sm" color="blue.600" fontWeight="medium">
              ({selectedIds.size} selected)
            </Text>
          )}
        </HStack>
        <HStack flexWrap="wrap" gap={2}>
          <Input
            type="month" size="sm" value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)} w="160px"
          />
          <Input
            size="sm" placeholder="Search lessee / lessee no." value={filterLessee}
            onChange={e => { setFilterLessee(e.target.value); setSelectedIds(new Set()); }}
            w="220px"
          />
          <Select
            size="sm" value={filterBuilding}
            onChange={e => { setFilterBuilding(e.target.value); setSelectedIds(new Set()); }}
            placeholder="All Buildings" w="160px"
          >
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select
            size="sm" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            placeholder="All Statuses" w="140px"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </Select>

          {selectedIds.size > 0 && (
            <Menu>
              <MenuButton
                as={Button} size="sm" colorScheme="teal"
                rightIcon={<ChevronDownIcon />} isLoading={bulkLoading}
              >
                Bulk Actions
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleDownloadSelected}>
                  Download PDF ({selectedIds.size})
                </MenuItem>
                <MenuItem onClick={handleMarkPrinted}>
                  Mark as Printed ({selectedIds.size})
                </MenuItem>
                <MenuDivider />
                <MenuItem onClick={handleRolloverSelected}>
                  Rollover to Next Month ({selectedIds.size})
                </MenuItem>
              </MenuList>
            </Menu>
          )}

          <PlanGatedButton
            variant="outline"
            size="sm"
            enabled={dataImportEnabled}
            upgradeMessage="CSV import is available on Starter, Growth, and Business plans."
            onClick={() => setCsvOpen(true)}
          >
            Import CSV
          </PlanGatedButton>
          <Button colorScheme="blue" size="sm" onClick={() => router.push('/dashboard/invoices/new')}>
            + New Invoice
          </Button>
        </HStack>
      </HStack>

      <InvoiceCsvUpload
        isOpen={csvOpen}
        onClose={() => setCsvOpen(false)}
        tenants={tenants}
        invoices={invoices}
        onImported={loadData}
      />

      {loading ? (
        <Spinner />
      ) : (
        <InvoiceList
          invoices={filtered}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          onDelete={handleDelete}
          onVoid={handleVoid}
        />
      )}
    </Box>
  );
}
