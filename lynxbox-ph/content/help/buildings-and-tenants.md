---
title: Buildings and Tenants
summary: Set up buildings, add tenants, and attach documents such as permits and leases.
order: 2
---

## Buildings

A building holds the settings shared by all its tenants:

- **Penalty Rate (%)**: the late-payment penalty applied to overdue charges for every tenant in the building.
- **VAT and withholding tax rates**: used when computing invoices.

Changing a building's penalty rate affects how penalty is calculated going forward for its tenants.

![Add Building form with rates](/help-images/add-building-rates.png)

![Video: adding a building](/help-videos/add-building.mp4)

## Tenants

Add a tenant from the **Tenants** page. Each tenant has contract details, charge settings, and optional toggles:

- **Penalty enabled / VAT enabled**: turn these on or off per tenant.
- **Payment waived**: for invoices you deliberately never collect payment for (for example, pure utility pass-throughs). Invoices created *after* you turn this on show "Waived - No Payment Required" and carry no amount due. Existing invoices are not changed.

![Add Tenant form: unit information](/help-images/add-tenant-unit.png)

![Add Tenant form: billing defaults](/help-images/add-tenant-billing.png)

![Video: adding a tenant](/help-videos/add-tenant.mp4)

### Importing tenants

Use **Import CSV** on the Tenants page. Download the template first, fill it in, and upload it. Rows with problems are flagged in the preview before anything is created. CSV import is not available on the Free plan.

### Row actions

Each tenant row has icon buttons for viewing, editing, deleting, creating an invoice, and recording a payment. Click anywhere on a row to open the tenant's detail page.

## Documents

Buildings and tenants can each have documents attached, such as SEC certificates, business permits, and government IDs. Lease contracts are attached separately, to the contract itself (see below).

### Other documents

- Open the building or tenant and use the **Documents** section to upload a file.
- Choose a category, an optional expiry date, and notes. **Lease Contract** is not in this list, because lease files are attached to a specific contract.
- Use the eye icon to view or download (the original file name is kept), the pencil to edit details, and the trash icon to delete.

![Upload Document dialog](/help-images/tenant-documents-upload.png)

![Video: attaching a document to a tenant](/help-videos/tenant-documents.mp4)

### Lease contracts

Attach a lease PDF to the contract it belongs to, so it always stays linked to the right lease period.

1. On the Tenants page, click the pencil icon to open **Edit Tenant**.
2. Scroll to **Contracts** and find the contract.
3. Click **Attach lease PDF** and choose the file.
4. The file then shows under that contract's period in the tenant's Documents list.

The contract must already be saved. If you just added it, save the tenant and reopen it; until then the row shows "Save tenant, then reopen to attach files".

![Attach lease PDF button on a contract](/help-images/tenant-contract-contract.png)

![Upload dialog for a lease contract](/help-images/tenant-contract-attach.png)

![Video: attaching a lease contract](/help-videos/tenant-contract.mp4)

Documents count toward your plan's storage limit.
