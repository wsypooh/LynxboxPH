'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Heading, Button, IconButton, HStack, Card, CardBody, CardHeader, Text,
  Badge, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  useToast, Spinner, SimpleGrid, Tooltip,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiUsers, FiFileText } from 'react-icons/fi';
import { buildingService } from '@/services/buildingService';
import { BuildingForm } from '@/features/invoicing/components/BuildingForm';
import { Building } from '@/features/invoicing/types';
import { documentService } from '@/services/documentService';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { DocumentUploadModal } from '@/features/documents/components/DocumentUploadModal';
import { Document } from '@/features/documents/types';

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
  const [docsBuilding, setDocsBuilding] = useState<Building | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const { isOpen: docsOpen, onOpen: openDocs, onClose: closeDocs } = useDisclosure();
  const { isOpen: uploadOpen, onOpen: openUpload, onClose: closeUpload } = useDisclosure();
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

  const handleOpenDocs = async (b: Building) => {
    setDocsBuilding(b);
    openDocs();
    try {
      const docs = await documentService.listDocuments('BUILDING', b.id);
      setDocuments(docs);
    } catch (err: any) {
      toast({ title: err.message || 'Error loading documents', status: 'error' });
    }
  };

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
                  <Tooltip label="Edit">
                    <IconButton aria-label="Edit building" icon={<FiEdit2 />} size="xs" variant="outline" onClick={() => handleEdit(b)} />
                  </Tooltip>
                  <Tooltip label="Tenants">
                    <IconButton aria-label="View tenants" icon={<FiUsers />} size="xs" variant="outline" colorScheme="blue" onClick={() => router.push(`/dashboard/tenants?buildingId=${b.id}`)} />
                  </Tooltip>
                  <Tooltip label="Documents">
                    <IconButton aria-label="View documents" icon={<FiFileText />} size="xs" variant="outline" colorScheme="purple" onClick={() => handleOpenDocs(b)} />
                  </Tooltip>
                  <Tooltip label="Delete">
                    <IconButton aria-label="Delete building" icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDelete(b.id)} />
                  </Tooltip>
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

      <Modal isOpen={docsOpen} onClose={() => { closeDocs(); setDocsBuilding(null); }} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Documents — {docsBuilding?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <HStack justify="flex-end" mb={4}>
              <Button size="sm" colorScheme="blue" onClick={openUpload}>+ Upload Document</Button>
            </HStack>
            <DocumentList
              documents={documents}
              onDelete={(docId) => setDocuments(prev => prev.filter(d => d.id !== docId))}
              onUpdate={(updated) => setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {docsBuilding && (
        <DocumentUploadModal
          isOpen={uploadOpen}
          onClose={closeUpload}
          parentType="BUILDING"
          parentId={docsBuilding.id}
          onUploaded={(doc) => setDocuments(prev => [...prev, doc])}
        />
      )}
    </Box>
  );
}
