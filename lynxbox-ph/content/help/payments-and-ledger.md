---
title: Payments and Ledger
summary: Record payments, understand how they are applied, and how penalties are computed.
order: 4
---

## The tenant ledger

Every invoice creates a charge in the tenant's **ledger**. The ledger shows the tenant's charges, payments, and the outstanding balance including penalties. Open a tenant to see it.

## Recording a payment

Click **Record Payment** on the tenant's page, or use the quick payment icon on the Tenants list. Enter the amount, date, payment method, and an optional note. The Tenants list shows the tenant's outstanding balance in the dialog.

![Tenants list with the Record Payment icon highlighted](/help-images/record-payment-1-icon.png)

In the dialog, enter the amount, choose the date and payment method, and add a note such as a reference number. The tenant's outstanding balance is shown at the top.

![Record Payment dialog filled in](/help-images/record-payment-2-form.png)

Payments are not recorded on individual invoices; they always go through the tenant.

Watch how it works:

![Video: recording a payment](/help-videos/record-payment.mp4)

## How payments are applied

Payments settle the **oldest unpaid charge first**, and for each charge the **penalty is paid before the principal**. An overpayment is tolerated.

## Penalties

- The rate comes from the tenant's building (**Penalty Rate (%)**).
- Penalty is simple interest on the remaining unpaid principal, counted by months overdue.
- Penalty only counts once it has been included in a generated invoice, so the ledger balance and the Invoices list agree.
- If a charge was imported with a historical penalty, it is just a note; the charge still accrues penalty normally.
- On a draft invoice you can manually override a penalty amount; that override sticks to the charge.

## Editing or voiding a payment

The owner can correct a recorded payment from the ledger's Payments table:

- **Edit** changes only the payment method and note.
- **Void** reverses the payment (restoring what it paid down) and removes it. To fix a wrong amount or date, void the payment and record it again.

## Importing historical balances

You can import a tenant's historical balances by CSV, optionally with a `penaltyAmount` column, so the ledger starts from the correct position.
