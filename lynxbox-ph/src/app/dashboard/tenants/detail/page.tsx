'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TenantDetailClient from '../[id]/TenantDetailClient';

function TenantDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  return <TenantDetailClient id={id} />;
}

export default function TenantDetailPage() {
  return (
    <Suspense>
      <TenantDetailContent />
    </Suspense>
  );
}
