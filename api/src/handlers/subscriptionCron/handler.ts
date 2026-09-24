import { AccountRepository } from '../../repositories/accountRepository';
import { revertAccountToFree, suspendAccountListings } from '../../lib/subscriptionLifecycle';
import { getCognitoUserEmail } from '../../lib/cognitoAdmin';
import { ZeptoMailService } from '../../lib/zeptomail';

const mailer = new ZeptoMailService();

// docs/Payments-and-Subscription-Plan.md
const TRIAL_REMINDER_DAYS_BEFORE = 3;
// Longer lead time than the trial reminder — a renewal needs the customer to submit proof
// AND platform-admin to verify it before the period actually lapses, not just a decision.
const RENEWAL_REMINDER_DAYS_BEFORE = 5;
const PAST_DUE_GRACE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / DAY_MS);
}

function daysSince(target: Date, from: Date): number {
  return Math.floor((from.getTime() - target.getTime()) / DAY_MS);
}

// Invoked daily by EventBridge against the same Lambda as the API (see api/src/index.ts's
// 'lynxboxph.scheduler' branch and infra/modules/api/cron.tf) — not a second function.
// Runs as one pass over every account's subscription row; each account's failure is
// isolated so one bad row never blocks the rest of the batch.
export class SubscriptionCronHandler {
  static async processDaily(): Promise<{
    trialReminders: number;
    trialExpired: number;
    renewalReminders: number;
    markedPastDue: number;
    revertedFromPastDue: number;
    errors: number;
  }> {
    const accounts = await AccountRepository.listAllSubscriptions();
    const now = new Date();
    const result = { trialReminders: 0, trialExpired: 0, renewalReminders: 0, markedPastDue: 0, revertedFromPastDue: 0, errors: 0 };

    for (const account of accounts) {
      try {
        if (account.subscriptionStatus === 'trialing' && account.trialEndsAt) {
          const trialEndsAt = new Date(account.trialEndsAt);

          if (trialEndsAt.getTime() <= now.getTime()) {
            await revertAccountToFree(account.accountId);
            result.trialExpired++;
            continue;
          }

          const daysLeft = daysUntil(trialEndsAt, now);
          if (daysLeft <= TRIAL_REMINDER_DAYS_BEFORE && !account.trialEndingSoonNotifiedAt) {
            await AccountRepository.markTrialEndingSoonNotified(account.accountId);
            try {
              const email = await getCognitoUserEmail(account.accountId);
              if (email) await mailer.sendTrialEndingSoonEmail(email, account.plan, daysLeft);
            } catch (err) {
              console.error(`Failed to send trial-ending-soon email for account ${account.accountId}:`, err);
            }
            result.trialReminders++;
          }
          continue;
        }

        if (account.subscriptionStatus === 'active' && account.currentPeriodEnd) {
          const currentPeriodEnd = new Date(account.currentPeriodEnd);

          if (currentPeriodEnd.getTime() <= now.getTime()) {
            // Immediate — this is what actually enforces "can't use the system until you
            // pay," not the 14-day grace window below (that only decides when the plan
            // itself reverts to Free if payment never comes).
            await AccountRepository.markPastDue(account.accountId);
            await suspendAccountListings(account.accountId);
            try {
              const email = await getCognitoUserEmail(account.accountId);
              if (email) await mailer.sendPaymentPastDueEmail(email, account.plan);
            } catch (err) {
              console.error(`Failed to send payment-past-due email for account ${account.accountId}:`, err);
            }
            result.markedPastDue++;
            continue;
          }

          // docs/Payments-and-Subscription-Plan.md — gives the customer a reason to use
          // early/stacked renewal instead of only ever finding out via the past-due email
          // above, after the fact. renewalReminderSentAt is cleared on every new period
          // (see AccountRepository.applyVerifiedPayment), so this fires once per period.
          const daysLeft = daysUntil(currentPeriodEnd, now);
          if (daysLeft <= RENEWAL_REMINDER_DAYS_BEFORE && !account.renewalReminderSentAt) {
            await AccountRepository.markRenewalReminderSent(account.accountId);
            try {
              const email = await getCognitoUserEmail(account.accountId);
              if (email) await mailer.sendRenewalDueSoonEmail(email, account.plan, daysLeft, account.currentPeriodEnd);
            } catch (err) {
              console.error(`Failed to send renewal-due-soon email for account ${account.accountId}:`, err);
            }
            result.renewalReminders++;
          }
          continue;
        }

        if (account.subscriptionStatus === 'past_due' && account.pastDueSince) {
          const pastDueSince = new Date(account.pastDueSince);
          if (daysSince(pastDueSince, now) >= PAST_DUE_GRACE_DAYS) {
            await revertAccountToFree(account.accountId);
            result.revertedFromPastDue++;
          }
        }
      } catch (err) {
        console.error(`SubscriptionCronHandler: failed processing account ${account.accountId}:`, err);
        result.errors++;
      }
    }

    console.log('SubscriptionCronHandler.processDaily result:', result);
    return result;
  }
}
