'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Heading, HStack, Button, Badge, useToast, Spinner, Tabs, TabList, Tab, TabPanels, TabPanel,
  useDisclosure, Text,
} from '@chakra-ui/react';
import { invoiceService } from '@/services/invoiceService';
import { tenantService } from '@/services/tenantService';
import { buildingService } from '@/services/buildingService';
import { InvoiceForm } from '@/features/invoicing/components/InvoiceForm';
import { StatementOfAccount } from '@/features/invoicing/components/StatementOfAccount';
import { PaymentModal } from '@/features/invoicing/components/PaymentModal';
import { Invoice, Tenant, Building, InvoiceStatus } from '@/features/invoicing/types';

const statusColor: Record<InvoiceStatus, string> = {
  draft: 'gray',
  sent: 'blue',
  partial: 'orange',
  paid: 'green',
  printed: 'purple',
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  check: 'Check',
  gcash: 'GCash',
  credit_card: 'Credit Card',
  bank: 'Bank',
  online_banking: 'Online Banking',
};

export default function InvoiceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen: paymentOpen, onOpen: openPayment, onClose: closePayment } = useDisclosure();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadInvoice = async () => {
    try {
      const [inv, t, b] = await Promise.all([
        invoiceService.getInvoice(id),
        tenantService.listTenants(),
        buildingService.listBuildings(),
      ]);
      setInvoice(inv);
      setTenants(t);
      setBuildings(b);
    } catch (err: any) {
      toast({ title: 'Failed to load invoice', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoice(); }, [id]);

  const handleUpdate = async (data: any) => {
    setSaving(true);
    try {
      const updated = await invoiceService.updateInvoice(id, data);
      setInvoice(updated);
      toast({ title: 'Invoice updated', status: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const updated = await invoiceService.sendInvoice(id);
      setInvoice(updated);
      toast({ title: 'Invoice sent via email', status: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Error sending', status: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceService.downloadPdf(id, invoice.invoiceNumber);
    } catch (err: any) {
      toast({ title: err.message || 'Error downloading PDF', status: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollover = async () => {
    setActionLoading(true);
    try {
      const draft = await invoiceService.rolloverInvoice(id);
      router.push(`/dashboard/invoices/new?prefill=${encodeURIComponent(JSON.stringify(draft))}`);
    } catch (err: any) {
      toast({ title: err.message || 'Error rolling over', status: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevertToDraft = async () => {
    if (!confirm('Revert this invoice to draft? It will be editable again.')) return;
    setActionLoading(true);
    try {
      const updated = await invoiceService.revertToDraft(id);
      setInvoice(updated);
      toast({ title: 'Invoice reverted to draft', status: 'info' });
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await invoiceService.deleteInvoice(id);
      toast({ title: 'Invoice deleted', status: 'info' });
      router.push('/dashboard/invoices');
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    }
  };

  const handlePayment = async (data: any) => {
    setActionLoading(true);
    try {
      const updated = await invoiceService.recordPayment(id, data);
      setInvoice(updated);
      toast({ title: 'Payment recorded', status: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Box p={6}><Spinner /></Box>;
  if (!invoice) return <Box p={6}><Text>Invoice not found.</Text></Box>;

  return (
    <Box p={6}>
      <HStack mb={4} justify="space-between" flexWrap="wrap" gap={2}>
        <HStack>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
          <Heading size="lg">{invoice.invoiceNumber}</Heading>
          <Badge colorScheme={statusColor[invoice.status]} fontSize="sm">{invoice.status}</Badge>
        </HStack>
        <HStack flexWrap="wrap" gap={2}>
          {(invoice.status === 'printed' || invoice.status === 'sent') && (
            <Button size="sm" variant="outline" colorScheme="purple" onClick={handleRevertToDraft} isLoading={actionLoading}>
              Revert to Draft
            </Button>
          )}
          {invoice.status !== 'printed' && invoice.status !== 'paid' && (
            <Button size="sm" colorScheme="green" onClick={openPayment} isLoading={actionLoading}>Record Payment</Button>
          )}
          <Button size="sm" colorScheme="blue" onClick={handleSend} isLoading={actionLoading}>Send Email</Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} isLoading={actionLoading}>Download PDF</Button>
          <Button size="sm" variant="outline" onClick={handleRollover} isLoading={actionLoading}>Roll Over</Button>
          <Button size="sm" colorScheme="red" variant="ghost" onClick={handleDelete}>Delete</Button>
        </HStack>
      </HStack>

      <Tabs defaultIndex={invoice.status !== 'draft' ? 1 : 0}>
        <TabList>
          <Tab isDisabled={invoice.status !== 'draft'}>Edit</Tab>
          <Tab>Statement</Tab>
          {invoice.payments.length > 0 && <Tab>Payments ({invoice.payments.length})</Tab>}
          {(invoice.statusHistory?.length ?? 0) > 0 && <Tab>History ({invoice.statusHistory.length})</Tab>}
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            {invoice.status !== 'draft' ? (
              <Text color="gray.500" fontSize="sm">Only draft invoices can be edited.</Text>
            ) : (
              <InvoiceForm
                tenants={tenants}
                buildings={buildings}
                defaultValues={invoice}
                onSubmit={handleUpdate}
                isLoading={saving}
                previousBalanceHistory={invoice.previousBalanceHistory}
                previousBalance={invoice.previousBalance}
              />
            )}
          </TabPanel>
          <TabPanel px={0}>
            <StatementOfAccount invoice={invoice} />
          </TabPanel>
          {invoice.payments.length > 0 && (
            <TabPanel px={0}>
              <Box overflowX="auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Method</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px' }}>{p.date}</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>
                          ₱{p.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px' }}>{PAYMENT_METHOD_LABELS[p.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || '—'}</td>
                        <td style={{ padding: '8px' }}>{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </TabPanel>
          )}
          {(invoice.statusHistory?.length ?? 0) > 0 && (
            <TabPanel px={0}>
              <Box overflowX="auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Date & Time</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>From</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>To</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(invoice.statusHistory ?? [])].reverse().map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px', color: '#718096', fontSize: '13px' }}>
                          {new Date(h.changedAt).toLocaleString('en-PH')}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            background: h.from === 'draft' ? '#e2e8f0' : h.from === 'printed' ? '#e9d8fd' : h.from === 'paid' ? '#c6f6d5' : '#bee3f8',
                            color: h.from === 'draft' ? '#4a5568' : h.from === 'printed' ? '#553c9a' : h.from === 'paid' ? '#276749' : '#2a69ac',
                            padding: '2px 8px', borderRadius: '9999px', fontSize: '12px',
                          }}>{h.from}</span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            background: h.to === 'draft' ? '#e2e8f0' : h.to === 'printed' ? '#e9d8fd' : h.to === 'paid' ? '#c6f6d5' : '#bee3f8',
                            color: h.to === 'draft' ? '#4a5568' : h.to === 'printed' ? '#553c9a' : h.to === 'paid' ? '#276749' : '#2a69ac',
                            padding: '2px 8px', borderRadius: '9999px', fontSize: '12px',
                          }}>{h.to}</span>
                        </td>
                        <td style={{ padding: '8px', color: '#718096', fontSize: '13px' }}>{h.changedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      <PaymentModal
        isOpen={paymentOpen}
        onClose={closePayment}
        onSubmit={handlePayment}
        isLoading={actionLoading}
        maxAmount={invoice.outstanding}
      />
    </Box>
  );
}
