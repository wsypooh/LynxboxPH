'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { accountService } from '@/services/accountService';
import { getActiveAccountId, setActiveAccountId } from '@/lib/auth';
import { AccountContext as AccountContextData, Membership, Role } from './types';

interface AccountContextValue {
  accountId: string;
  role: Role;
  isPlatformAdmin: boolean;
  memberships: Membership[];
  isLoading: boolean;
  canWrite: boolean;
  canDestroy: boolean;
  canManageMembers: boolean;
  switchAccount: (accountId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AccountReactContext = createContext<AccountContextValue | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [context, setContext] = useState<AccountContextData | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [me, myMemberships] = await Promise.all([
        accountService.getMe(),
        accountService.listMemberships(),
      ]);
      setContext(me);
      setMemberships(myMemberships);
    } catch (error) {
      console.error('Failed to load account context:', error);
      setContext(null);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      load();
    } else {
      setContext(null);
      setMemberships([]);
      setIsLoading(false);
    }
  }, [user, load]);

  const switchAccount = useCallback(async (accountId: string) => {
    setActiveAccountId(accountId);
    await load();
  }, [load]);

  const role = context?.role ?? 'owner';

  const value: AccountContextValue = {
    accountId: context?.accountId ?? '',
    role,
    isPlatformAdmin: context?.isPlatformAdmin ?? false,
    memberships,
    isLoading,
    canWrite: role === 'owner' || role === 'manager' || role === 'staff',
    canDestroy: role === 'owner',
    canManageMembers: role === 'owner',
    switchAccount,
    refresh: load,
  };

  return (
    <AccountReactContext.Provider value={value}>
      {children}
    </AccountReactContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountReactContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

// Re-export getActiveAccountId's counterpart so callers don't need to know it also
// lives in lib/auth.ts (used by getAuthHeaders on every request).
export { getActiveAccountId };
