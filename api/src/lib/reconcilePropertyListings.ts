import { Plan } from '../models/account';
import { PLAN_LIMITS } from './planLimits';
import { PropertyRepository, isPropertyExpired } from '../repositories/propertyRepository';

// Called whenever an account's plan changes (today: only from the platform-admin manual
// plan-toggle endpoint). Standalone on purpose — the future Payments and Subscription
// plan's daily cron reuses this exact function for its "past-due, revert to Free" case,
// so the unlisting rule only ever lives in one place.
export async function reconcilePropertyListingsForPlan(accountId: string, newPlan: Plan): Promise<void> {
  const maxProperties = PLAN_LIMITS[newPlan].maxProperties;
  if (maxProperties === Infinity) return;

  const { items } = await PropertyRepository.listByOwner(accountId, 1000);
  // Same "counts against the cap" definition as createProperty's check: available and not
  // expired. A rented/sold/maintenance/already-expired listing isn't occupying a slot, so
  // downgrading never touches it — only genuinely active listings get unlisted.
  const active = items.filter(p => p.status === 'available' && !isPropertyExpired(p.expiresAt));
  const excessCount = active.length - maxProperties;
  if (excessCount <= 0) return;

  // Oldest-created first — the newest listings are the ones most likely still relevant.
  const oldestFirst = [...active].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const toUnlist = oldestFirst.slice(0, excessCount);

  await Promise.all(toUnlist.map(p => PropertyRepository.update(p.id, { status: 'unlisted' })));
}
