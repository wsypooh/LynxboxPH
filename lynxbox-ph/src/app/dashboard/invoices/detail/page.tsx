'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import InvoiceDetailClient from '../[id]/InvoiceDetailClient';

function InvoiceDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  return <InvoiceDetailClient id={id} />;
}

export default function InvoiceDetailPage() {
  return (
    <Suspense>
      <InvoiceDetailContent />
    </Suspense>
  );
}
