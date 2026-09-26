import { useEffect, useState } from 'react';
import { billingService } from '@/services/billingService';
import { PlanLimits } from '@/features/billing/types';

// Fetches the current account's plan limits once, for components that only need to gate a
// UI feature (not render usage numbers) — `null` while loading or if the fetch fails; every
// consumer picks its own fail-open/closed default via `limits?.someFlag ?? <default>`.
export function usePlanLimits(): PlanLimits | null {
  const [limits, setLimits] = useState<PlanLimits | null>(null);

  useEffect(() => {
    billingService.getUsage()
      .then(usage => setLimits(usage.limits))
      .catch(() => {});
  }, []);

  return limits;
}
