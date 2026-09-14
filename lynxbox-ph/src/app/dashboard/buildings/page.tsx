'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Heading, Button, HStack, Card, CardBody, CardHeader, Text,
  Badge, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  useToast, Spinner, SimpleGrid,
} from '@chakra-ui/react';
import { buildingService } from '@/services/buildingService';
import { BuildingForm } from '@/features/invoicing/components/BuildingForm';
import { Building } from '@/features/invoicing/types';

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length === 10 && d.startsWith('02')) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 12 && d.startsWith('63')) return `+63 ${d.slice(2, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editBuilding, setEditBuilding] = useState<Building | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const router = useRouter();

  const loadBuildings = async () => {
    try {
      const data = await buildingService.listBuildings();
      setBuildings(data);
    } catch (err: any) {
      toast({ title: 'Failed to load buildings', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBuildings(); }, []);

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editBuilding) {
        const updated = await buildingService.updateBuilding(editBuilding.id, data);
        setBuildings(prev => prev.map(b => b.id === editBuilding.id ? updated : b));
        toast({ title: 'Building updated', status: 'success' });
      } else {
        const created = await buildingService.createBuilding(data);
        setBuildings(prev => [...prev, created]);
        toast({ title: 'Building created', status: 'success' });
      }
      onClose();
      setEditBuilding(null);
    } catch (err: any) {
      toast({ title: err.message || 'Error saving building', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (b: Building) => { setEditBuilding(b); onOpen(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this building?')) return;
    try {
      await buildingService.deleteBuilding(id);
      setBuildings(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Building deleted', status: 'info' });
    } catch (err: any) {
      toast({ title: err.message || 'Error deleting building', status: 'error' });
    }
  };

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Buildings</Heading>
        <Button colorScheme="blue" onClick={() => { setEditBuilding(null); onOpen(); }}>+ Add Building</Button>
      </HStack>

      {loading ? (
        <Spinner />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {buildings.map(b => (
            <Card key={b.id}>
              <CardHeader pb={1}>
                <Heading size="sm">{b.name}</Heading>
              </CardHeader>
              <CardBody pt={1}>
                <Text fontSize="sm" color="gray.600">{b.address}</Text>
                <Text fontSize="sm" color="gray.600">Tel: {formatPhone(b.phone || '')}</Text>
                <HStack mt={2} spacing={2} flexWrap="wrap">
                  <Badge>Electricity: ₱{b.currentElectricityRate}/kWh</Badge>
                  <Badge colorScheme="orange">Penalty: {(b.penaltyRate * 100).toFixed(0)}%</Badge>
                  {b.earlyPaymentDiscountRate > 0 && (
                    <Badge colorScheme="green">Discount: {(b.earlyPaymentDiscountRate * 100).toFixed(0)}%</Badge>
                  )}
                </HStack>
                <HStack mt={3} spacing={2}>
                  <Button size="xs" variant="outline" onClick={() => handleEdit(b)}>Edit</Button>
                  <Button size="xs" variant="outline" colorScheme="blue" onClick={() => router.push(`/dashboard/tenants?buildingId=${b.id}`)}>Tenants</Button>
                  <Button size="xs" variant="ghost" colorScheme="red" onClick={() => handleDelete(b.id)}>Delete</Button>
                </HStack>
              </CardBody>
            </Card>
          ))}
          {buildings.length === 0 && (
            <Text color="gray.500">No buildings yet. Create your first building.</Text>
          )}
        </SimpleGrid>
      )}

      <Modal isOpen={isOpen} onClose={() => { onClose(); setEditBuilding(null); }} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editBuilding ? 'Edit Building' : 'Add Building'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <BuildingForm
              defaultValues={editBuilding || undefined}
              onSubmit={handleSubmit}
              onCancel={() => { onClose(); setEditBuilding(null); }}
              isLoading={saving}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
