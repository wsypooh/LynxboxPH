import { Metadata } from 'next'
import AuthLayoutClient from './AuthLayoutClient'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in or create an account to manage your commercial property listings',
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>
}
