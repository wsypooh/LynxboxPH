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
import { InvoiceBulkReadingsModal } from '@/features/invoicing/components/InvoiceBulkReadingsModal';
import { Invoice, Building, Tenant } from '@/features/invoicing/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from '@/features/account/AccountContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { PlanGatedButton } from '@/components/PlanGatedButton';

const FILTERS_KEY = 'invoices-filters-v1';

function loadStoredFilters(): { month: string; status: string; building: string; lessee: string; waived: string } {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    return { month: defaultMonth, status: '', building: '', lessee: '', waived: '', ...JSON.parse(localStorage.getItem(FILTERS_KEY) ?? '{}') };
  } catch {
    return { month: defaultMonth, status: '', building: '', lessee: '', waived: '' };
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [readingsOpen, setReadingsOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => loadStoredFilters().month);
  const [filterStatus, setFilterStatus] = useState(() => loadStoredFilters().status);
  const [filterBuilding, setFilterBuilding] = useState(() => loadStoredFilters().building);
  const [filterLessee, setFilterLessee] = useState(() => loadStoredFilters().lessee);
  const [filterWaived, setFilterWaived] = useState(() => loadStoredFilters().waived);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canDestroy } = useAccount();
  const planLimits = usePlanLimits();
  const dataImportEnabled = planLimits?.dataImportEnabled ?? true;

  const loadData = async () => {
    setLoading(true);
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
        month: filterMonth, status: filterStatus, building: filterBuilding, lessee: filterLessee, waived: filterWaived,
      }));
    } catch {}
  }, [filterMonth, filterStatus, filterBuilding, filterLessee, filterWaived]);

  const filtered = useMemo(() => {
    let result = filterBuilding ? invoices.filter(inv => inv.buildingId === filterBuilding) : invoices;
    if (filterLessee.trim()) {
      const q = filterLessee.trim().toLowerCase();
      result = result.filter(inv =>
        inv.lesseeName?.toLowerCase().includes(q) ||
        inv.tenantCode?.toLowerCase().includes(q)
      );
    }
    if (filterWaived === 'waived') result = result.filter(inv => inv.waived);
    else if (filterWaived === 'not-waived') result = result.filter(inv => !inv.waived);
    return result;
  }, [invoices, filterBuilding, filterLessee, filterWaived]);

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
    let skipped = 0;
    try {
      for (const inv of selectedInvoices) {
        try {
          const draft = await invoiceService.rolloverInvoice(inv.id);
          await invoiceService.createInvoice(draft);
          succeeded++;
        } catch (err: any) {
          // createInvoice (handler.ts) now rejects a tenant+billingMonth that already has a
          // non-void invoice -- e.g. this tenant was already rolled over in an earlier run.
          // Surface that as a skip, not a failure, so re-running rollover on an overlapping
          // selection doesn't read as broken.
          if (err?.message?.includes('already exists')) skipped++;
          else failed++;
        }
      }
      toast({
        title: `${succeeded} invoice(s) rolled over` +
          (skipped > 0 ? `, ${skipped} skipped (already rolled over)` : '') +
          (failed > 0 ? `, ${failed} failed` : ''),
        status: failed > 0 ? 'warning' : 'success',
      });
      if (succeeded > 0) {
        // Rollover never modifies the source invoice -- the new ones land in next month's
        // bucket, invisible under the current filter. Advance the filter instead of re-fetching
        // this month's (provably unchanged) data; the useEffect on filterMonth reloads for us.
        const [year, month] = filterMonth.split('-').map(Number);
        const next = new Date(year, month, 1);
        setFilterMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
      } else {
        await loadData();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    // Backend only allows deleting drafts (handler.ts's deleteInvoice) -- anything else must be
    // voided instead to preserve its invoice number/audit trail -- so non-draft rows in the
    // selection are left alone rather than erroring out the whole batch.
    const eligible = selectedInvoices.filter(inv => inv.status === 'draft');
    const skipped = selectedInvoices.length - eligible.length;
    if (eligible.length === 0) {
      toast({ title: 'None of the selected invoices can be deleted — only drafts can be deleted; void the others instead.', status: 'warning' });
      return;
    }
    if (!confirm(
      `Delete ${eligible.length} invoice(s)? This cannot be undone.` +
      (skipped > 0 ? ` ${skipped} non-draft invoice(s) in your selection will be left as-is.` : '')
    )) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const inv of eligible) {
        try {
          await invoiceService.deleteInvoice(inv.id);
          succeeded++;
        } catch {
          failed++;
        }
      }
      toast({
        title: `${succeeded} invoice(s) deleted` +
          (skipped > 0 ? `, ${skipped} skipped (not draft)` : '') +
          (failed > 0 ? `, ${failed} failed` : ''),
        status: failed > 0 ? 'warning' : 'success',
      });
      await loadData();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleVoidSelected = async () => {
    // Mirrors the per-row icon logic in InvoiceList.tsx: draft invoices are deleted, not voided,
    // and an already-void invoice has nothing left to do.
    const eligible = selectedInvoices.filter(inv => inv.status !== 'draft' && inv.status !== 'void');
    const skipped = selectedInvoices.length - eligible.length;
    if (eligible.length === 0) {
      toast({ title: 'None of the selected invoices can be voided — drafts should be deleted instead, and void invoices are already void.', status: 'warning' });
      return;
    }
    if (!confirm(
      `Void ${eligible.length} invoice(s)? They'll be excluded from balances but kept on record.` +
      (skipped > 0 ? ` ${skipped} invoice(s) in your selection (draft or already void) will be left as-is.` : '')
    )) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const inv of eligible) {
        try {
          await invoiceService.voidInvoice(inv.id);
          succeeded++;
        } catch {
          failed++;
        }
      }
      toast({
        title: `${succeeded} invoice(s) voided` +
          (skipped > 0 ? `, ${skipped} skipped` : '') +
          (failed > 0 ? `, ${failed} failed` : ''),
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
            <option value="printed">Printed</option>
            <option value="void">Void</option>
          </Select>
          <Select
            size="sm" value={filterWaived}
            onChange={e => { setFilterWaived(e.target.value); setSelectedIds(new Set()); }}
            placeholder="All Invoices" w="160px"
          >
            <option value="waived">Payment Waived</option>
            <option value="not-waived">Not Waived</option>
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
                <MenuItem onClick={() => setReadingsOpen(true)}>
                  Enter Meter Readings ({selectedIds.size})
                </MenuItem>
                {canDestroy && (
                  <>
                    <MenuDivider />
                    <MenuItem onClick={handleVoidSelected} color="red.500">
                      Void ({selectedIds.size})
                    </MenuItem>
                    <MenuItem onClick={handleDeleteSelected} color="red.500">
                      Delete ({selectedIds.size})
                    </MenuItem>
                  </>
                )}
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

      <InvoiceBulkReadingsModal
        isOpen={readingsOpen}
        onClose={() => setReadingsOpen(false)}
        invoices={selectedInvoices}
        onUpdated={loadData}
      />

      {loading ? (
        <HStack py={10} justify="center" color="gray.500">
          <Spinner size="md" />
          <Text>Loading invoices…</Text>
        </HStack>
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
