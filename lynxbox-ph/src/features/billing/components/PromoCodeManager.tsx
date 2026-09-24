'use client'

import { useState } from 'react'
import {
  Table, Thead, Tbody, Tr, Th, Td, HStack, IconButton, Tooltip, Badge, Button, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, Checkbox, useDisclosure, VStack, Text,
} from '@chakra-ui/react'
import { FiSlash, FiPlus, FiEdit2 } from 'react-icons/fi'
import { paymentVerificationService } from '@/services/paymentVerificationService'
import { PromoCode } from '@/features/billing/types'

// yyyy-MM-dd for a native <input type="date">; PromoCode.expiresAt is a full ISO string.
function toDateInputValue(iso?: string): string {
  return iso ? iso.slice(0, 10) : ''
}

const emptyForm = {
  code: '',
  discountType: 'percent' as 'percent' | 'fixed',
  discountValue: 0,
  durationPeriods: 1,
  autoApply: false,
  maxRedemptions: '' as number | '',
  startsAt: '',
  expiresAt: '',
  active: true,
}

// Distinguishes "not yet started" from a plain "Active" — without this, a future-dated
// code would show the same green "Active" badge as one that's actually live right now,
// which would be misleading for something you specifically scheduled ahead of time.
function getStatus(c: PromoCode): { label: string; colorScheme: string } {
  if (!c.active) return { label: 'Inactive', colorScheme: 'gray' }
  const now = Date.now()
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= now) return { label: 'Expired', colorScheme: 'gray' }
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Scheduled', colorScheme: 'blue' }
  return { label: 'Active', colorScheme: 'green' }
}

export default function PromoCodeManager({ codes, onChanged }: { codes: PromoCode[]; onChanged: () => void }) {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null) // null = creating a new code
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditingCode(null)
    setForm(emptyForm)
    onOpen()
  }

  const openEdit = (c: PromoCode) => {
    setEditingCode(c.code)
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      durationPeriods: c.durationPeriods,
      autoApply: c.autoApply,
      maxRedemptions: c.maxRedemptions ?? '',
      startsAt: toDateInputValue(c.startsAt),
      expiresAt: toDateInputValue(c.expiresAt),
      active: c.active,
    })
    onOpen()
  }

  const handleDeactivate = async (c: string) => {
    setBusyCode(c)
    try {
      await paymentVerificationService.deactivatePromoCode(c)
      toast({ title: 'Promo code deactivated', status: 'info' })
      onChanged()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to deactivate', status: 'error' })
    } finally {
      setBusyCode(null)
    }
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.discountValue) {
      toast({ title: 'Code and discount value are required', status: 'error' })
      return
    }
    const startsAtIso = form.startsAt ? new Date(form.startsAt).toISOString() : undefined
    const expiresAtIso = form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined
    if (startsAtIso && expiresAtIso && new Date(startsAtIso) >= new Date(expiresAtIso)) {
      toast({ title: 'Start date must be before the expiry date', status: 'error' })
      return
    }

    setSaving(true)
    try {
      if (editingCode) {
        // Editing: an optional field cleared to blank must be sent as `null` — the
        // request body is JSON, and JSON.stringify drops `undefined` keys entirely, so
        // omitting the key (which is what `undefined` would do) can't be told apart from
        // "leave this field alone." `null` is PromoCodeRepository.update()'s explicit
        // "remove this attribute" signal.
        await paymentVerificationService.updatePromoCode(editingCode, {
          discountType: form.discountType,
          discountValue: form.discountValue,
          durationPeriods: form.durationPeriods,
          autoApply: form.autoApply,
          maxRedemptions: form.maxRedemptions === '' ? null : form.maxRedemptions,
          startsAt: startsAtIso ?? null,
          expiresAt: expiresAtIso ?? null,
          active: form.active,
        })
        toast({ title: 'Promo code updated', status: 'success' })
      } else {
        // Creating: there's no prior value to clear, so a blank field is simply omitted.
        await paymentVerificationService.createPromoCode({
          code: form.code.trim(),
          discountType: form.discountType,
          discountValue: form.discountValue,
          durationPeriods: form.durationPeriods,
          autoApply: form.autoApply,
          maxRedemptions: form.maxRedemptions === '' ? undefined : form.maxRedemptions,
          startsAt: startsAtIso,
          expiresAt: expiresAtIso,
          active: true,
        })
        toast({ title: 'Promo code created', status: 'success' })
      }
      onClose()
      onChanged()
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save promo code', status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <HStack justify="flex-end" mb={4}>
        <Button leftIcon={<FiPlus />} colorScheme="primary" size="sm" onClick={openCreate}>New Promo Code</Button>
      </HStack>

      {codes.length === 0 ? (
        <Text color="gray.500">No promo codes yet.</Text>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Duration</Th>
              <Th>Auto-apply</Th>
              <Th>Starts</Th>
              <Th>Expires</Th>
              <Th>Redemptions</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {codes.map(c => (
              <Tr key={c.code}>
                <Td fontWeight="medium">{c.code}</Td>
                <Td>{c.discountType === 'percent' ? `${c.discountValue}%` : `₱${c.discountValue}`}</Td>
                <Td>{c.durationPeriods} period(s)</Td>
                <Td>{c.autoApply ? 'Yes' : 'No'}</Td>
                <Td>{c.startsAt ? new Date(c.startsAt).toLocaleDateString('en-PH') : 'Immediately'}</Td>
                <Td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-PH') : 'Never'}</Td>
                <Td>{c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</Td>
                <Td><Badge colorScheme={getStatus(c).colorScheme}>{getStatus(c).label}</Badge></Td>
                <Td>
                  <HStack spacing={1}>
                    <Tooltip label="Edit">
                      <IconButton
                        aria-label="Edit promo code"
                        icon={<FiEdit2 />}
                        size="xs"
                        variant="outline"
                        onClick={() => openEdit(c)}
                      />
                    </Tooltip>
                    {c.active && (
                      <Tooltip label="Deactivate">
                        <IconButton
                          aria-label="Deactivate promo code"
                          icon={<FiSlash />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          isLoading={busyCode === c.code}
                          onClick={() => handleDeactivate(c.code)}
                        />
                      </Tooltip>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCode ? `Edit ${editingCode}` : 'New Promo Code'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Code</FormLabel>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="LAUNCH50"
                  isDisabled={!!editingCode}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Discount type</FormLabel>
                <Select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percent' | 'fixed' })}>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount off</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Discount value {form.discountType === 'percent' ? '(%)' : '(₱)'}</FormLabel>
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />
              </FormControl>
              <FormControl>
                <FormLabel>Duration (billing periods)</FormLabel>
                <Input type="number" min={1} value={form.durationPeriods} onChange={(e) => setForm({ ...form, durationPeriods: Number(e.target.value) })} />
              </FormControl>
              <FormControl>
                <FormLabel>Max redemptions (optional)</FormLabel>
                <Input
                  type="number"
                  value={form.maxRedemptions}
                  onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Starts on (optional)</FormLabel>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Expires on (optional)</FormLabel>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </FormControl>
              <FormControl>
                <Checkbox isChecked={form.autoApply} onChange={(e) => setForm({ ...form, autoApply: e.target.checked })}>
                  Auto-apply (shows automatically on pricing page, no code entry needed)
                </Checkbox>
              </FormControl>
              {editingCode && (
                <FormControl>
                  <Checkbox isChecked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}>
                    Active
                  </Checkbox>
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="primary" onClick={handleSave} isLoading={saving}>{editingCode ? 'Save' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
