'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Heading, useToast, Spinner } from '@chakra-ui/react';
import { invoiceService } from '@/services/invoiceService';
import { tenantService } from '@/services/tenantService';
import { buildingService } from '@/services/buildingService';
import { InvoiceForm } from '@/features/invoicing/components/InvoiceForm';
import { Tenant, Building } from '@/features/invoicing/types';

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previousReadings, setPreviousReadings] = useState<{ electricity?: number; water?: number }>({});

  const preselectedTenantId = searchParams.get('tenantId') || '';
  const prefillParam = searchParams.get('prefill');
  const draftData = prefillParam ? JSON.parse(decodeURIComponent(prefillParam)) : undefined;

  useEffect(() => {
    const load = async () => {
      const [t, b] = await Promise.all([tenantService.listTenants(), buildingService.listBuildings()]);
      setTenants(t);
      setBuildings(b);

      // Coming from "+ New Invoice" on the tenant page (not a Roll Over prefill) — carry
      // forward meter readings from the tenant's most recent invoice so they don't reset to 0.
      if (preselectedTenantId && !prefillParam) {
        try {
          const invs = await tenantService.listInvoicesByTenant(preselectedTenantId);
          const latest = [...invs].sort((a, b) => b.billingMonth.localeCompare(a.billingMonth))[0];
          if (latest) {
            setPreviousReadings({
              electricity: latest.electricity?.mode !== 'direct' ? latest.electricity?.presentReading : undefined,
              water: latest.water?.mode === 'metered' ? latest.water?.presentReading : undefined,
            });
          }
        } catch {
          // No prior invoices for this tenant — leave readings blank.
        }
      }

      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      const invoice = await invoiceService.createInvoice(data);
      toast({ title: 'Invoice created', status: 'success' });
      router.push(`/dashboard/invoices/detail?id=${invoice.id}`);
    } catch (err: any) {
      toast({ title: err.message || 'Error creating invoice', status: 'error' });
      setSaving(false);
    }
  };

  if (loading) return <Box p={6}><Spinner /></Box>;

  return (
    <Box p={6} maxW="900px">
      <Heading size="lg" mb={6}>New Invoice</Heading>
      <InvoiceForm
        tenants={tenants}
        buildings={buildings}
        defaultValues={preselectedTenantId ? { tenantId: preselectedTenantId } as any : undefined}
        draftData={draftData}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={saving}
        previousBalanceHistory={draftData?.previousBalanceHistory}
        previousElectricityReading={previousReadings.electricity}
        previousWaterReading={previousReadings.water}
      />
    </Box>
  );
}
