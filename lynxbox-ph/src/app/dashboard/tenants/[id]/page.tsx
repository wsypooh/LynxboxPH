import TenantDetailClient from './TenantDetailClient';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  return <TenantDetailClient id={params.id} />;
}
