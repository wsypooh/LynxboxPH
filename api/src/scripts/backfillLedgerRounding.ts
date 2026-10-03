// One-time backfill: LedgerRepository.recordPaymentWithFIFO used to subtract
// principalApplied/penaltyApplied from principalOutstanding/penaltyPaid/remaining with plain
// float arithmetic, so repeated payments could drift a charge's outstanding balance onto a
// 3+ decimal artifact (e.g. 8716.452, 0.002) instead of a clean centavo value. That call site
// now rounds every step via round2() (api/src/lib/money.ts), but existing ChargeEntry/
// PaymentEntry/Invoice rows written before the fix still carry the drifted values. This re-
// rounds every monetary field on every ChargeEntry, PaymentEntry and Invoice record, writing
// back only the rows that actually change. Safe to re-run — a clean row is a no-op.
// Run with `npm run ledger:backfill-rounding` from api/, against the correct DYNAMODB_TABLE.
// Pass --dry-run (or set DRY_RUN=1) to only report what would change, with no writes.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, EntityType } from '../lib/dynamodb';
import { round2 } from '../lib/money';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'lynxbox-ph-dev';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

async function scanAll(entityType: EntityType): Promise<Record<string, any>[]> {
  const items: Record<string, any>[] = [];
  let ExclusiveStartKey: any = undefined;
  do {
    const res = await ddbDocClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :t',
      ExpressionAttributeValues: { ':t': entityType },
      ExclusiveStartKey,
    }));
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function updateFields(pk: string, sk: string, fields: Record<string, any>) {
  if (DRY_RUN) return;
  const names: Record<string, string> = {};
  const values: Record<string, any> = {};
  const expressions: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    expressions.push(`#${key} = :${key}`);
  }
  await ddbDocClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

async function fixChargeEntries(): Promise<number> {
  const items = await scanAll(EntityType.LEDGER_ENTRY);
  const charges = items.filter(i => i.entryType === 'charge');
  let fixed = 0;
  for (const charge of charges) {
    const fields: Record<string, number> = {};
    const principalAmount = round2(charge.principalAmount ?? 0);
    const principalOutstanding = round2(charge.principalOutstanding ?? 0);
    const penaltyPaid = round2(charge.penaltyPaid ?? 0);
    if (principalAmount !== charge.principalAmount) fields.principalAmount = principalAmount;
    if (principalOutstanding !== charge.principalOutstanding) fields.principalOutstanding = principalOutstanding;
    if (penaltyPaid !== charge.penaltyPaid) fields.penaltyPaid = penaltyPaid;
    if (charge.importedPenalty != null) {
      const importedPenalty = round2(charge.importedPenalty);
      if (importedPenalty !== charge.importedPenalty) fields.importedPenalty = importedPenalty;
    }
    if (Object.keys(fields).length > 0) {
      await updateFields(charge.PK, charge.SK, fields);
      console.log(`  charge ${charge.id}:`, fields);
      fixed++;
    }
  }
  return fixed;
}

async function fixPaymentEntries(): Promise<number> {
  const items = await scanAll(EntityType.LEDGER_ENTRY);
  const payments = items.filter(i => i.entryType === 'payment');
  let fixed = 0;
  for (const payment of payments) {
    const fields: Record<string, any> = {};
    const totalAmount = round2(payment.totalAmount ?? 0);
    if (totalAmount !== payment.totalAmount) fields.totalAmount = totalAmount;

    let appliedToChanged = false;
    const appliedTo = (payment.appliedTo ?? []).map((a: any) => {
      const principalApplied = round2(a.principalApplied ?? 0);
      const penaltyApplied = round2(a.penaltyApplied ?? 0);
      if (principalApplied !== a.principalApplied || penaltyApplied !== a.penaltyApplied) appliedToChanged = true;
      return { ...a, principalApplied, penaltyApplied };
    });
    if (appliedToChanged) fields.appliedTo = appliedTo;

    if (Object.keys(fields).length > 0) {
      await updateFields(payment.PK, payment.SK, fields);
      console.log(`  payment ${payment.id}:`, fields);
      fixed++;
    }
  }
  return fixed;
}

// Deep-equal via JSON — every value here is plain numbers/strings/nested plain objects
// (no Dates, no undefined-vs-missing subtlety survives a DynamoDB round-trip), so this is
// safe and far simpler than a structural diff for deciding whether an array/object field
// actually changed after rounding.
function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

async function fixInvoices(): Promise<number> {
  const invoices = await scanAll(EntityType.INVOICE);
  let fixed = 0;
  // Snapshotted/denormalized copies (previousBalanceHistory, paymentsReceived, payments) can
  // carry the same FIFO rounding drift baked in from whatever ChargeEntry/PaymentEntry they
  // were copied from at invoice-creation time — fixing the source records (above) does not
  // retroactively fix these copies, so they need their own pass.
  const scalarMoneyFields = [
    'rent', 'vat', 'withholdingTax', 'guard', 'discount',
    'subtotal', 'currentChargesTotal', 'previousBalance', 'totalDue', 'amountPaid', 'outstanding',
  ];
  for (const invoice of invoices) {
    const fields: Record<string, any> = {};

    for (const key of scalarMoneyFields) {
      if (invoice[key] == null) continue;
      const rounded = round2(invoice[key]);
      if (rounded !== invoice[key]) fields[key] = rounded;
    }

    if (invoice.water?.amount != null) {
      const water = { ...invoice.water, amount: round2(invoice.water.amount) };
      if (changed(water, invoice.water)) fields.water = water;
    }
    if (invoice.electricity?.amount != null) {
      const electricity = { ...invoice.electricity, amount: round2(invoice.electricity.amount) };
      if (changed(electricity, invoice.electricity)) fields.electricity = electricity;
    }
    if (Array.isArray(invoice.otherCharges)) {
      const otherCharges = invoice.otherCharges.map((c: any) => ({ ...c, amount: round2(c.amount ?? 0) }));
      if (changed(otherCharges, invoice.otherCharges)) fields.otherCharges = otherCharges;
    }
    if (Array.isArray(invoice.payments)) {
      const payments = invoice.payments.map((p: any) => ({ ...p, amount: round2(p.amount ?? 0) }));
      if (changed(payments, invoice.payments)) fields.payments = payments;
    }
    if (Array.isArray(invoice.paymentsReceived)) {
      const paymentsReceived = invoice.paymentsReceived.map((p: any) => ({ ...p, totalAmount: round2(p.totalAmount ?? 0) }));
      if (changed(paymentsReceived, invoice.paymentsReceived)) fields.paymentsReceived = paymentsReceived;
    }
    if (Array.isArray(invoice.previousBalanceHistory)) {
      const previousBalanceHistory = invoice.previousBalanceHistory.map((e: any) => ({
        ...e,
        amountDue: round2(e.amountDue ?? 0),
        amountPaid: round2(e.amountPaid ?? 0),
        outstanding: round2(e.outstanding ?? 0),
        penalty: round2(e.penalty ?? 0),
      }));
      if (changed(previousBalanceHistory, invoice.previousBalanceHistory)) fields.previousBalanceHistory = previousBalanceHistory;
    }

    if (Object.keys(fields).length > 0) {
      await updateFields(invoice.PK, invoice.SK, fields);
      console.log(`  invoice ${invoice.id}:`, Object.keys(fields));
      fixed++;
    }
  }
  return fixed;
}

async function main() {
  const verb = DRY_RUN ? 'Would fix' : 'Fixed';
  console.log(`Backfilling rounding drift on table: ${TABLE_NAME}${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);

  console.log('Scanning charge entries...');
  const chargesFixed = await fixChargeEntries();
  console.log(`${verb} ${chargesFixed} charge entr${chargesFixed === 1 ? 'y' : 'ies'}.`);

  console.log('Scanning payment entries...');
  const paymentsFixed = await fixPaymentEntries();
  console.log(`${verb} ${paymentsFixed} payment entr${paymentsFixed === 1 ? 'y' : 'ies'}.`);

  console.log('Scanning invoices...');
  const invoicesFixed = await fixInvoices();
  console.log(`${verb} ${invoicesFixed} invoice(s).`);

  console.log(DRY_RUN ? 'Dry run complete — no changes written.' : 'Backfill complete.');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
