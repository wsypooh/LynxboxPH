import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manage Properties | Lynxbox PH',
  description: 'Manage your commercial property listings',
}

export default function DashboardPropertiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
