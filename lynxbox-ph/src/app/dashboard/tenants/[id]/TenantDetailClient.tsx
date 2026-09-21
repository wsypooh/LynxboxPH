'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Heading, Text, VStack, HStack, Badge, Button, Card, CardBody, CardHeader,
  useToast, Spinner, Table, Thead, Tbody, Tr, Th, Td, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
} from '@chakra-ui/react';
import { tenantService } from '@/services/tenantService';
import { buildingService } from '@/services/buildingService';
import { invoiceService } from '@/services/invoiceService';
import { InvoiceList } from '@/features/invoicing/components/InvoiceList';
import { InvoiceCsvUpload } from '@/features/invoicing/components/InvoiceCsvUpload';
import { LedgerView } from '@/features/invoicing/components/LedgerView';
import { LedgerCsvUpload } from '@/features/invoicing/components/LedgerCsvUpload';
import { PaymentModal } from '@/features/invoicing/components/PaymentModal';
import { TenantForm } from '@/features/invoicing/components/TenantForm';
import { Tenant, Building, Invoice } from '@/features/invoicing/types';
import { documentService } from '@/services/documentService';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { DocumentUploadModal } from '@/features/documents/components/DocumentUploadModal';
import { Document } from '@/features/documents/types';

export default function TenantDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledgerReloadToken, setLedgerReloadToken] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { isOpen: paymentOpen, onOpen: openPayment, onClose: closePayment } = useDisclosure();
  const { isOpen: editOpen, onOpen: openEdit, onClose: closeEdit } = useDisclosure();
  const { isOpen: invoiceCsvOpen, onOpen: openInvoiceCsv, onClose: closeInvoiceCsv } = useDisclosure();
  const { isOpen: ledgerCsvOpen, onOpen: openLedgerCsv, onClose: closeLedgerCsv } = useDisclosure();
  const { isOpen: uploadOpen, onOpen: openUpload, onClose: closeUpload } = useDisclosure();

  useEffect(() => {
    const load = async () => {
      try {
        const [t, invs, allBuildings, docs] = await Promise.all([
          tenantService.getTenant(id),
          tenantService.listInvoicesByTenant(id),
          buildingService.listBuildings(),
          documentService.listDocuments('TENANT', id),
        ]);
        setTenant(t);
        setInvoices(invs);
        setBuildings(allBuildings);
        setDocuments(docs);
        if (t.buildingId) {
          const b = await buildingService.getBuilding(t.buildingId);
          setBuilding(b);
        }
      } catch (err: any) {
        toast({ title: 'Failed to load tenant', status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleUpdate = async (data: any) => {
    setSaving(true);
    try {
      const updated = await tenantService.updateTenant(id, data);
      setTenant(updated);
      if (updated.buildingId) {
        const b = await buildingService.getBuilding(updated.buildingId);
        setBuilding(b);
      }
      toast({ title: 'Tenant updated', status: 'success' });
      closeEdit();
    } catch (err: any) {
      toast({ title: err.message || 'Error updating tenant', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const reloadInvoices = async () => {
    const invs = await tenantService.listInvoicesByTenant(id);
    setInvoices(invs);
    setLedgerReloadToken(t => t + 1);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await invoiceService.deleteInvoice(invoiceId);
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
      setLedgerReloadToken(t => t + 1);
      toast({ title: 'Invoice deleted', status: 'info' });
    } catch (err: any) {
      toast({ title: err.message || 'Error deleting invoice', status: 'error' });
    }
  };

  const handleVoidInvoice = async (invoiceId: string) => {
    if (!confirm('Void this invoice? It will be excluded from balances but kept on record.')) return;
    try {
      const updated = await invoiceService.voidInvoice(invoiceId);
      setInvoices(prev => prev.map(i => i.id === invoiceId ? updated : i));
      setLedgerReloadToken(t => t + 1);
      toast({ title: 'Invoice voided', status: 'info' });
    } catch (err: any) {
      toast({ title: err.message || 'Error voiding invoice', status: 'error' });
    }
  };

  const handleLedgerPayment = async (data: any) => {
    setPaymentLoading(true);
    try {
      await tenantService.recordLedgerPayment(id, data);
      setLedgerReloadToken(t => t + 1);
      toast({ title: 'Payment recorded', status: 'success' });
    } catch (err: any) {
      toast({ title: err.message || 'Error recording payment', status: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleResetLedger = async () => {
    if (!confirm(
      `Reset the ledger for ${tenant?.lesseeName}?\n\nThis clears ALL imported balances and payments recorded for this tenant (soft-deleted, not permanently erased, but there's no undo in this screen). Only do this to recover from a bad import — not as routine cleanup.`
    )) return;
    setResetLoading(true);
    try {
      const result = await tenantService.resetLedger(id);
      setLedgerReloadToken(t => t + 1);
      toast({
        title: `Ledger reset: ${result.chargesCleared} charge(s), ${result.paymentsCleared} payment(s) cleared`,
        status: 'info',
      });
    } catch (err: any) {
      toast({ title: err.message || 'Error resetting ledger', status: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  const contractLabel = (contractId: string) => {
    const contract = tenant?.contracts.find(c => c.id === contractId);
    return contract ? `Contract: ${contract.startDate} – ${contract.endDate}` : undefined;
  };

  if (loading) return <Box p={6}><Spinner /></Box>;
  if (!tenant) return <Box p={6}><Text>Tenant not found.</Text></Box>;

  return (
    <Box p={6}>
      <HStack mb={4} justify="space-between">
        <HStack>
          <Button variant="ghost" onClick={() => router.back()}>← Back</Button>
          <Heading size="lg">{tenant.lesseeName}</Heading>
          <Badge colorScheme={tenant.status === 'active' ? 'green' : 'gray'} ml={2}>{tenant.status}</Badge>
        </HStack>
        <Button size="sm" variant="outline" onClick={openEdit}>Edit Tenant</Button>
      </HStack>

      <VStack align="stretch" spacing={4}>
        <Card>
          <CardHeader pb={1}><Heading size="sm">Unit &amp; Contact</Heading></CardHeader>
          <CardBody>
            <HStack spacing={8} flexWrap="wrap">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Building</Text>
                <Text fontWeight="medium">{building?.name || tenant.buildingId}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Unit</Text>
                <Text fontWeight="medium">{tenant.floor} {tenant.roomNumber}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Area</Text>
                <Text fontWeight="medium">{tenant.area} sqm</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Lessee No.</Text>
                <Text fontFamily="mono">{tenant.tenantCode}</Text>
              </VStack>
              {tenant.contactEmail && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Email</Text>
                  <Text>{tenant.contactEmail}</Text>
                </VStack>
              )}
              {tenant.contactPhone && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Phone</Text>
                  <Text>{tenant.contactPhone}</Text>
                </VStack>
              )}
              {tenant.tin && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">TIN</Text>
                  <Text>{tenant.tin}</Text>
                </VStack>
              )}
            </HStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb={1}><Heading size="sm">Billing Defaults</Heading></CardHeader>
          <CardBody>
            <HStack spacing={8} flexWrap="wrap">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Default Rent</Text>
                <Text fontWeight="medium">₱{tenant.defaultRent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">VAT</Text>
                <Badge colorScheme={tenant.vatEnabled ? 'green' : 'gray'}>
                  {tenant.vatEnabled ? 'Enabled (12%)' : 'Disabled'}
                </Badge>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Withholding Tax</Text>
                <Badge colorScheme={tenant.withholdingTaxEnabled ? 'green' : 'gray'}>
                  {tenant.withholdingTaxEnabled ? 'Enabled (5%)' : 'Disabled'}
                </Badge>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Water</Text>
                <Text>
                  {tenant.waterMode === 'metered'
                    ? `Metered (₱${tenant.defaultWaterRate}/m³)`
                    : `Fixed (₱${tenant.defaultFixedWater})`}
                </Text>
              </VStack>
              {(tenant.defaultGuard ?? 0) > 0 && (
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.500">Guard</Text>
                  <Text>₱{(tenant.defaultGuard ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                </VStack>
              )}
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color="gray.500">Penalty</Text>
                <Text color={(tenant.penaltyEnabled ?? true) ? 'green.600' : 'red.500'}>
                  {(tenant.penaltyEnabled ?? true) ? 'Enabled' : 'Disabled'}
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {tenant.contracts && tenant.contracts.length > 0 && (
          <Card>
            <CardHeader pb={1}><Heading size="sm">Contract History</Heading></CardHeader>
            <CardBody>
              <Table size="sm">
                <Thead>
                  <Tr><Th>Start</Th><Th>End</Th><Th isNumeric>Rent</Th><Th isNumeric>Deposit</Th><Th>Notes</Th></Tr>
                </Thead>
                <Tbody>
                  {tenant.contracts.map((c, i) => (
                    <Tr key={i} bg={i === tenant.contracts.length - 1 ? 'blue.50' : undefined}>
                      <Td>{c.startDate}</Td>
                      <Td>{c.endDate}</Td>
                      <Td isNumeric>₱{c.rentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                      <Td isNumeric>₱{c.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Td>
                      <Td>{c.notes || '—'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader pb={1}>
            <HStack justify="space-between">
              <Heading size="sm">Ledger &amp; Outstanding Balances</Heading>
              <HStack>
                <Button size="sm" variant="outline" onClick={openLedgerCsv}>Import Historical Balances</Button>
                <Button size="sm" colorScheme="green" onClick={openPayment}>Record Payment</Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            <LedgerView tenantId={id} penaltyEnabled={tenant.penaltyEnabled} reloadToken={ledgerReloadToken} />
            <HStack justify="flex-end" mt={4}>
              <Button size="xs" variant="ghost" colorScheme="red" onClick={handleResetLedger} isLoading={resetLoading}>
                Reset Ledger for This Tenant
              </Button>
            </HStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb={1}>
            <HStack justify="space-between">
              <Heading size="sm">Invoices</Heading>
              <HStack>
                <Button size="sm" variant="outline" onClick={openInvoiceCsv}>Import CSV</Button>
                <Button size="sm" colorScheme="blue" onClick={() => router.push(`/dashboard/invoices/new?tenantId=${id}`)}>
                  + New Invoice
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            <InvoiceList
              invoices={invoices}
              selectedIds={new Set()}
              onToggle={() => {}}
              onToggleAll={() => {}}
              onDelete={handleDeleteInvoice}
              onVoid={handleVoidInvoice}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb={1}>
            <HStack justify="space-between">
              <Heading size="sm">Documents</Heading>
              <Button size="sm" colorScheme="blue" onClick={openUpload}>+ Upload Document</Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <DocumentList
              documents={documents}
              onDelete={(docId) => setDocuments(prev => prev.filter(d => d.id !== docId))}
              onUpdate={(updated) => setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))}
              contractLabel={contractLabel}
            />
          </CardBody>
        </Card>
      </VStack>

      <DocumentUploadModal
        isOpen={uploadOpen}
        onClose={closeUpload}
        parentType="TENANT"
        parentId={id}
        onUploaded={(doc) => setDocuments(prev => [...prev, doc])}
      />

      <InvoiceCsvUpload
        isOpen={invoiceCsvOpen}
        onClose={closeInvoiceCsv}
        tenants={[tenant]}
        invoices={invoices}
        onImported={reloadInvoices}
      />

      <LedgerCsvUpload
        isOpen={ledgerCsvOpen}
        onClose={closeLedgerCsv}
        tenants={[tenant]}
        onImported={() => setLedgerReloadToken(t => t + 1)}
      />

      <PaymentModal
        isOpen={paymentOpen}
        onClose={closePayment}
        onSubmit={handleLedgerPayment}
        isLoading={paymentLoading}
      />

      <Modal isOpen={editOpen} onClose={closeEdit} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Tenant</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <TenantForm
              buildings={buildings}
              defaultValues={tenant}
              onSubmit={handleUpdate}
              onCancel={closeEdit}
              isLoading={saving}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
