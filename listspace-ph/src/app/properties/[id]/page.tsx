import PropertyDetailClient from './PropertyDetailClient'

export default function Page({ params }: { params: { id: string } }) {
  return <PropertyDetailClient id={params.id} />
}
