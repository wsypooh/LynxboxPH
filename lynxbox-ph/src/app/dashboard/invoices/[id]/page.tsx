import InvoiceDetailClient from './InvoiceDetailClient';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return <InvoiceDetailClient id={params.id} />;
}
