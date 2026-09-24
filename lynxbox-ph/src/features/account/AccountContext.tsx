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
  // Mirrors api/src/lib/auth.ts's canManageBilling(actor) — kept as its own field (not
  // reused from canDestroy/canManageMembers) since it's a separate concept that could
  // diverge from those later, even though the role check is identical today.
  canManageBilling: boolean;
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

  // Every account-scoped page (dashboard stats, properties, invoices, billing, etc.)
  // fetches its own data in a useEffect keyed on the Cognito user, not on the active
  // account — switching accounts doesn't change that user, so nothing would otherwise
  // know to refetch. A full reload is the simplest way to make every already-mounted
  // page pick up the new X-Account-Id header, rather than reworking every page's fetch
  // effect to also depend on accountId.
  const switchAccount = useCallback(async (accountId: string) => {
    setActiveAccountId(accountId);
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  }, []);

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
    canManageBilling: role === 'owner',
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
