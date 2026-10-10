---
title: Invoices
summary: Create, edit, roll over, import, and void rental invoices.
order: 3
---

## Creating an invoice

Create an invoice for a tenant and billing month from the **Invoices** page or from the tenant's row. Only one non-void invoice can exist per tenant and billing month; trying to create a second is rejected.

A new invoice starts as a **draft**. While it is a draft you can edit charges, meter readings, and the previous-balance details. Once it is sent or printed, it can no longer be freely edited.

## Meter readings

For metered electricity or water, enter the present and previous reading; the amount is computed from the rate.

- Use **Enter Meter Readings** (bulk action) to fill in readings for several draft invoices in one grid.
- A reading you saved earlier is shown again when you reopen the grid.

## Rolling over to the next month

- **Roll Over** on a single invoice creates next month's invoice.
- **Rollover to Next Month** on the Invoices list does it for many tenants at once. Tenants that already have next month's invoice are skipped, not duplicated.

## Importing and exporting

**Import CSV** can create new invoices, and can also *update* an existing **draft** invoice for the same tenant and month (for example, to fill in a meter reading). Non-draft matches are not updated. **Export CSV** downloads your invoices. Both are unavailable on the Free plan.

## Status

An invoice's status (sent, partial, paid) follows the tenant's payments automatically. You do not mark invoices as paid by hand.

Note: **Mark as Printed** has no effect once a payment has already been applied to that invoice.

## Voiding vs deleting

- A **draft** that was never sent can be deleted.
- Anything that has ever left draft cannot be deleted. Use **Void** instead; the invoice and its number are kept for your records, but its charge is removed from the tenant's balance.

## Statement of Account / PDF

Each invoice can be viewed as a Statement of Account and downloaded as a PDF. It shows previous balance, current charges, payments received since the previous invoice, and the total due.
