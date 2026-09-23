import AccountDetailClient from './AccountDetailClient';

export async function generateStaticParams() {
  return [{ accountId: '_' }];
}

export default function PlatformAdminAccountDetailPage({ params }: { params: { accountId: string } }) {
  return <AccountDetailClient accountId={params.accountId} />;
}
