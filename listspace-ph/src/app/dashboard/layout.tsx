import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | ListSpace PH',
  description: 'Manage your commercial property listings and rental operations',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
