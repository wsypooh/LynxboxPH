import PropertyDetailClient from './PropertyDetailClient'
import { PropertyService } from '@/features/properties/services/propertyService'

export const dynamicParams = false

export async function generateStaticParams() {
  const ids = await PropertyService.getAllPropertyIds()
  return ids.map((id) => ({ id }))
}

export default function Page({ params }: { params: { id: string } }) {
  return <PropertyDetailClient id={params.id} />
}
