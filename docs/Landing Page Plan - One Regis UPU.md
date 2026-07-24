# Plan: One Regis Upper Penthouse Landing Page

## Context
Create a property-for-sale landing page at `/properties/bacolod-condo-for-sale-one-regis-upper-penthouse`. The page showcases a 50 sqm upper penthouse at One Regis, Bacolod, and captures leads via an inquiry form routed to the owner via ZeptoMail.

**Image storage approach:** Manually upload the 16 property photos to S3 at `properties/one-regis-upu/images/{name}.jpg`. The landing page uses the existing `SecureImage` component with a hardcoded `propertyId="one-regis-upu"` — it calls `/api/public/properties/one-regis-upu/images/view-url?imageKey=...` to get presigned view URLs. When DynamoDB is wired up later, swap the hardcoded ID for the real one.

---

## Step 0: Manual S3 Upload (Before Coding)

Upload all 16 images to the `lynxbox-ph-objects-dev-ap-southeast-1` bucket using AWS CLI or console with these exact S3 keys:

```
properties/one-regis-upu/images/living-room.jpg
properties/one-regis-upu/images/living-room-2.jpg
properties/one-regis-upu/images/living-dining.jpg
properties/one-regis-upu/images/living-dining-bedroom.jpg
properties/one-regis-upu/images/kitchen-dining.jpg
properties/one-regis-upu/images/kitchen.jpg
properties/one-regis-upu/images/bedroom-1.jpg
properties/one-regis-upu/images/bedroom-2.jpg
properties/one-regis-upu/images/bedroom-3.jpg
properties/one-regis-upu/images/bedroom-4.jpg
properties/one-regis-upu/images/bedroom-5.jpg
properties/one-regis-upu/images/bath-1.jpg
properties/one-regis-upu/images/bath-2.jpg
properties/one-regis-upu/images/bath-3.jpg
properties/one-regis-upu/images/utility-room.jpg
properties/one-regis-upu/images/entry.jpg
```

AWS CLI example:
```bash
aws s3 cp "P-UPU Living room.jpg" s3://lynxbox-ph-objects-dev-ap-southeast-1/properties/one-regis-upu/images/living-room.jpg
```

---

## Files to Change

### 1. NEW: `lynxbox-ph/src/app/properties/bacolod-condo-for-sale-one-regis-upper-penthouse/page.tsx`

A `'use client'` component using **inline styles** (same pattern as `landlord/`, `realtor/`, `business-address/`). No Chakra UI.

**Image keys** are hardcoded as a constant array of the 16 S3 keys above. The hero uses the first image (`living-room.jpg`) as background. The gallery renders all 16 via `SecureImage`.

```tsx
const PROPERTY_ID = 'one-regis-upu';
const IMAGE_KEYS = [
  'properties/one-regis-upu/images/living-room.jpg',
  // ... all 16 keys
];
```

**Page sections:**
1. **Hero** — `SecureImage` as full-width background with dark overlay, logo, H1 ("50 sqm Upper Penthouse Condo for Sale in Bacolod"), key stat badges (50 sqm · 12th Floor · 2 Bathrooms · Fully Furnished)
2. **Property Highlights** — icon + text grid of the 11 spec bullets
3. **Photo Gallery** — CSS `auto-fill` grid using `SecureImage` for all 16 images
4. **Flexible Living + Why This Unit Stands Out** — content sections with checkmark list from spec
5. **Lead Capture Form** — centered in the page; on success shows confirmation message instead
6. **Location section** — walking distance bullets
7. **CTA section** — dark background, repeat lead form

**Form fields & tag encoding:**
| Field | Required | Tag format |
|-------|----------|------------|
| Full Name | Yes | — |
| Mobile Number | Yes | `phone:09xxxxxxxx` |
| Email Address | No | — |
| Preferred Contact Method (radio) | No | `contact:whatsapp\|viber\|sms\|messenger\|email` |
| What best describes you? (radio) | No | `intent:future-home\|investment\|exploring\|broker` |
| When planning to purchase? (radio) | No | `timeline:within-30-days\|within-3-months\|within-6-months\|just-researching` |

Submit button label: **"Get Property Details"**  
Source: `"one-regis-upper-penthouse"`  
Tags always include: `["one-regis-upu", "for-sale"]` + any filled optional fields.

On success: replace form with the confirmation message from the spec ("Thank you for your inquiry! We've received your request...").

### 2. MODIFY: `api/src/handlers/signup/handler.ts`

Make `email` optional and skip welcome email for property listing sources:
- Line 56: `if (!data.name || !data.email)` → `if (!data.name)`  
- Lines 61–63: Wrap email regex check in `if (data.email) { ... }`  
- Lines 83–88: Wrap `sendWelcomeEmail` call in `if (data.email && data.source !== 'one-regis-upper-penthouse') { ... }`  
- `sendInternalNotification` already extracts `phone:` from tags — no change needed

---

## Reused Patterns
- `SecureImage` component (`lynxbox-ph/src/components/SecureImage.tsx`) — `propertyId` + `imageKey` → presigned view URL via public API endpoint
- Form submit → `${NEXT_PUBLIC_API_URL}/api/signup` POST JSON (from `business-address/page.tsx:36`)
- Toast/confirmation pattern (from `business-address/page.tsx:11–16`)
- Inline `style={{}}` objects with `clamp()` for responsive sizing (throughout existing landing pages)
- Tag encoding `phone:`, `contact:`, `intent:`, `timeline:` (extends existing `phone:` pattern)

---

## Verification
1. Upload all 16 images to S3 manually first
2. `npm run dev` in `lynxbox-ph/`, visit `http://localhost:3000/properties/bacolod-condo-for-sale-one-regis-upper-penthouse`
3. Confirm hero image loads and all 16 gallery images appear
4. Submit form with mobile only (no email) → should succeed (API change)
5. Submit form with email → should succeed (no welcome email sent — internal notification only)
6. Check `ZEPTOMAIL_INTERNAL_EMAIL` receives notification with all tags
7. Confirm success confirmation message replaces the form
