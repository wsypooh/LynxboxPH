'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box, Heading, Button, HStack, Select, Input, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, useToast, Spinner,
} from '@chakra-ui/react';
import { tenantService } from '@/services/tenantService';
import { buildingService } from '@/services/buildingService';
import { TenantForm } from '@/features/invoicing/components/TenantForm';
import { TenantList } from '@/features/invoicing/components/TenantList';
import { TenantCsvUpload } from '@/features/invoicing/components/TenantCsvUpload';
import { Tenant, Building } from '@/features/invoicing/types';

export default function TenantsPage() {
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterBuilding, setFilterBuilding] = useState(searchParams.get('buildingId') || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLessee, setFilterLessee] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isCsvOpen, onOpen: onCsvOpen, onClose: onCsvClose } = useDisclosure();
  const toast = useToast();

  const loadData = async () => {
    try {
      const [t, b] = await Promise.all([
        tenantService.listTenants(filterBuilding || undefined),
        buildingService.listBuildings(),
      ]);
      setTenants(t);
      setBuildings(b);
    } catch (err: any) {
      toast({ title: 'Failed to load data', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterBuilding]);

  const filteredTenants = useMemo(() => {
    let result = filterStatus ? tenants.filter(t => t.status === filterStatus) : tenants;
    if (filterLessee.trim()) {
      const q = filterLessee.trim().toLowerCase();
      result = result.filter(t =>
        t.lesseeName?.toLowerCase().includes(q) ||
        t.tenantCode?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tenants, filterStatus, filterLessee]);

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editTenant) {
        await tenantService.updateTenant(editTenant.id, data);
        toast({ title: 'Tenant updated', status: 'success' });
      } else {
        await tenantService.createTenant(data);
        toast({ title: 'Tenant created', status: 'success' });
      }
      onClose();
      setEditTenant(null);
      await loadData();
    } catch (err: any) {
      toast({ title: err.message || 'Error saving tenant', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tenant?')) return;
    try {
      await tenantService.deleteTenant(id);
      toast({ title: 'Tenant deleted', status: 'info' });
      await loadData();
    } catch (err: any) {
      toast({ title: err.message || 'Error', status: 'error' });
    }
  };

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Tenants</Heading>
        <HStack>
          <Input
            size="sm" placeholder="Search lessee / lessee no." value={filterLessee}
            onChange={e => setFilterLessee(e.target.value)} w="220px"
          />
          <Select
            size="sm"
            value={filterBuilding}
            onChange={e => setFilterBuilding(e.target.value)}
            placeholder="All Buildings"
            w="200px"
          >
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select
            size="sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            placeholder="All Statuses"
            w="140px"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Button variant="outline" onClick={onCsvOpen}>Import CSV</Button>
          <Button colorScheme="blue" onClick={() => { setEditTenant(null); onOpen(); }}>+ Add Tenant</Button>
        </HStack>
      </HStack>

      {loading ? (
        <Spinner />
      ) : (
        <TenantList
          tenants={filteredTenants}
          buildings={buildings}
          onEdit={t => { setEditTenant(t); onOpen(); }}
          onDelete={handleDelete}
        />
      )}

      <TenantCsvUpload
        isOpen={isCsvOpen}
        onClose={onCsvClose}
        buildings={buildings}
        tenants={tenants}
        onImported={loadData}
      />

      <Modal isOpen={isOpen} onClose={() => { onClose(); setEditTenant(null); }} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editTenant ? 'Edit Tenant' : 'Add Tenant'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <TenantForm
              buildings={buildings}
              defaultValues={editTenant || undefined}
              onSubmit={handleSubmit}
              onCancel={() => { onClose(); setEditTenant(null); }}
              isLoading={saving}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
