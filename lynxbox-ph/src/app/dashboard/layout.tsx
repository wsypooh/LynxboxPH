import { Metadata } from 'next'
import { DashboardSidebar, DashboardMobileNav } from './DashboardSidebar'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your commercial property listings and rental operations',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', paddingTop: '16px' }}>
      <DashboardMobileNav />
      <div style={{ display: 'flex' }}>
        <DashboardSidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
