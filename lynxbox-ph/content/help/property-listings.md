---
title: Property Listings
summary: Advertise vacant units publicly, manage photos, statuses, renewals, and bulk import.
order: 5
---

Property listings are public ads for units you want to rent. They are separate from your buildings and tenants.

## Adding a listing

Go to **Properties** in your dashboard and add a property. Fill in title, price, type (office, retail, warehouse, industrial, land), location (pick province, then city), floor, area, and features.

- **Photos**: upload and drag to reorder (desktop). Choose the default photo shown first. Photos are resized and watermarked automatically.
- **Floor** means which floor the unit is on, not how many floors the building has. Use 1 for the ground floor, 2 for the second floor, and so on. Use -1 for the first basement level (B1), -2 for B2, etc.

![Add Property form](/help-images/add-property-listing-basic.png)

![Property photos section](/help-images/add-property-listing-images.png)

![Video: adding a property listing](/help-videos/add-property-listing.mp4)

## Statuses

- **Draft**: not public, does not count toward your plan's active-listing limit.
- **Available**: public and counts toward your limit.
- **Rented / Sold / Maintenance**: no longer counts toward your limit.
- **Unlisted**: set automatically if a plan downgrade leaves you over the limit (oldest listings first). Nothing is deleted.

Publishing a draft (or moving a listing back to Available) checks your plan limit and starts a fresh visibility period.

## Visibility and renewal

Listings stay visible for a period set by your plan, then expire from public view. Use **Renew** on any available listing to restart the period; the expiry date is shown next to it.

## Privacy and statistics

Visitors never see your phone or email in search results. They are revealed when a visitor clicks Call or Email on a listing. You can see views, calls, and emails per listing in your dashboard; the public cannot.

## Bulk import

On Starter, Growth, and Business plans (not Free), **Import CSV** creates or updates many listings, optionally with a companion ZIP of photos (match file names in the image columns). Rows import as drafts unless you set `status` to `available`; the preview flags rows that would exceed your limit before anything is created. Values containing commas must be quoted in the CSV.

![Import Properties dialog](/help-images/property-import-import.png)

![Video: importing listings from a CSV](/help-videos/property-import.mp4)
