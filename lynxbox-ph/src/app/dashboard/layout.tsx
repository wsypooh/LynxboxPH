import { Metadata } from 'next'
import { DashboardSidebar } from './DashboardSidebar'

export const metadata: Metadata = {
  title: 'Dashboard | Lynxbox PH',
  description: 'Manage your commercial property listings and rental operations',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: '16px' }}>
      <DashboardSidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
