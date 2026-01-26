import PropertyDetailClient from './PropertyDetailClient'

export async function generateStaticParams() {
  // Pre-build some common property IDs for static export
  // Add your actual property IDs here
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: 'ddf2b374-bf7a-46d6-bb68-47f07cbf3359' }, // Add your actual property ID
  ]
}

export default function Page({ params }: { params: { id: string } }) {
  return <PropertyDetailClient id={params.id} />
}
