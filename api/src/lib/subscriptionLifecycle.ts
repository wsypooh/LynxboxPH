import { AccountRepository } from '../repositories/accountRepository';
import { PropertyRepository } from '../repositories/propertyRepository';
import { reconcilePropertyListingsForPlan } from './reconcilePropertyListings';
import { getCognitoUserEmail } from './cognitoAdmin';
import { ZeptoMailService } from './zeptomail';

const mailer = new ZeptoMailService();

async function activePropertiesFor(accountId: string) {
  const { items } = await PropertyRepository.listByOwner(accountId, 1000);
  return items.filter(p => !p.deletedAt);
}

// docs/Payments-and-Subscription-Plan.md — the immediate, reversible "hide everything"
// action the instant an account goes past_due. Distinct from reconcilePropertyListingsForPlan
// (Pricing-Strategy-Plan.md), which is the permanent per-listing unlisting on an actual
// plan downgrade — this just flips a flag on every currently-listed property.
export async function suspendAccountListings(accountId: string): Promise<void> {
  const properties = await activePropertiesFor(accountId);
  const toSuspend = properties.filter(p => p.status !== 'unlisted' && !p.listingSuspended);
  await Promise.all(toSuspend.map(p => PropertyRepository.update(p.id, { listingSuspended: true })));
}

export async function unsuspendAccountListings(accountId: string): Promise<void> {
  const properties = await activePropertiesFor(accountId);
  const toUnsuspend = properties.filter(p => p.listingSuspended);
  await Promise.all(toUnsuspend.map(p => PropertyRepository.update(p.id, { listingSuspended: false })));
}

// Used by the trial-expiry cron branch, the 14-day-past-due-expiry cron branch, AND a
// customer's own voluntary "Downgrade to Free" action — one function, not duplicated
// logic, either way. Documents are never touched (Pricing-Strategy-Plan.md section 4);
// only listings are affected, via the existing downgrade-unlisting function. `reason`
// only changes the email copy — "lapsed" (cron, didn't pay) vs "voluntary" (customer chose to).
export async function revertAccountToFree(accountId: string, reason: 'lapsed' | 'voluntary' = 'lapsed'): Promise<void> {
  await AccountRepository.revertToFree(accountId);
  await unsuspendAccountListings(accountId);
  await reconcilePropertyListingsForPlan(accountId, 'free');

  try {
    const email = await getCognitoUserEmail(accountId);
    if (email) await mailer.sendDowngradedToFreeEmail(email, reason);
  } catch (err) {
    console.error(`Failed to send downgraded-to-free email for account ${accountId}:`, err);
  }
}
