import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication | ListSpace PH',
  description: 'Sign in or create an account to manage your commercial property listings',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  )
}
