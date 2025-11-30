import { Metadata } from 'next'
import AuthLayoutClient from './AuthLayoutClient'

export const metadata: Metadata = {
  title: 'Authentication | ListSpace PH',
  description: 'Sign in or create an account to manage your commercial property listings',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>
}
