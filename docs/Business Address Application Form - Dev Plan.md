# Plan: Business Address Application Form Page

## Context
The business-address landing page needs a dedicated application form page at `/business-address/application-form`. This page is sent to customers who are ready to apply for the Business Address & Mail Handling Service. It collects applicant and business information, including a government ID upload. At this stage, data is saved to S3 as CSV and the ID image is stored as a file in S3. On success, the user sees a confirmation with their submitted details.

> **Note:** Currently deferring this in favor of Google Forms for immediate use. Build this when DynamoDB is ready and an admin dashboard is planned.

---

## Files to Create/Modify

### New Files
- `lynxbox-ph/src/app/business-address/application-form/page.tsx` — frontend form page
- `api/src/handlers/application/handler.ts` — API handler

### Modified Files
- `api/src/index.ts` — add route for `/api/application`
- `api/serverless.yml` — add new API endpoint definition

---

## Implementation Plan

### 1. API Handler (`api/src/handlers/application/handler.ts`)

Reuse patterns from `api/src/handlers/signup/handler.ts`:
- Same `S3Client`, `PutObjectCommand`, `GetObjectCommand` imports
- Same `streamToString()` helper
- Same `ApiResponse` utility from `api/src/lib/apiResponse.ts`

**Request body fields:**
```
fullName, businessName, businessType, mobileNumber, email,
residentialAddress, govIdType, idNumber, natureOfBusiness,
websiteFacebook, addressUsage[], expectedMailTypes[],
govIdFile: { data: string (base64), fileName: string, contentType: string }
```

**S3 operations:**
1. Save application row to `applications/applications.csv` (same append-or-create pattern as signup)
   - CSV columns: `timestamp, fullName, businessName, businessType, mobileNumber, email, residentialAddress, govIdType, idNumber, natureOfBusiness, websiteFacebook, addressUsage, expectedMailTypes, govIdFileKey`
2. Save ID image to `applications/ids/{timestamp}-{sanitizedName}.{ext}` using `PutObjectCommand`

**Response:** Return `ApiResponse.success({ message, applicationId, submittedData })` — the frontend uses `submittedData` to show the confirmation screen.

**Validation:** fullName, businessName, mobileNumber, email, govIdType required. Email regex check. Base64 file size guard (reject if > ~4MB base64 string to stay under Lambda 6MB limit).

---

### 2. Route Registration (`api/src/index.ts`)

Add before the property handler fallback:
```typescript
if (event.path?.endsWith('/api/application') && event.httpMethod === 'POST') {
  return await ApplicationHandler.submit(event);
}
```

---

### 3. Serverless Config (`api/serverless.yml`)

Add to `functions.api.events`:
```yaml
- http:
    path: api/application
    method: post
    cors: true
```

---

### 4. Frontend Page (`lynxbox-ph/src/app/business-address/application-form/page.tsx`)

**No layout.tsx change needed** — `/business-address/*` is already in the `isLandingPage` check.

**Page structure:**
- Same hero/header style as `business-address/page.tsx` (dark `#0e2949` header, logo)
- Two states: `formView` and `successView` (toggle on successful submit, no page navigation)

**Form sections (from `docs/Business Address Service.md`):**
1. **Applicant Information** — Full Name, Business Name, Business Type (radio: Sole Proprietorship / Partnership / Corporation / Freelancer / Other), Mobile Number, Email, Residential Address
2. **Government ID** — ID type (radio: National ID / Passport / Driver's License / PRC ID / Other), ID Number, File upload input
3. **Business Information** — Nature of Business, Website/Facebook Page, Address usage checkboxes (DTI / SEC / Mayor's Permit / BIR / Business Correspondence / Marketing Materials / Website), Expected mail types checkboxes (Government / Permit / Bank / Supplier / Customer / Other)

**File upload:**
- Reuse `convertFileToBase64` and `validateImageFile` from `lynxbox-ph/src/lib/utils.ts`
- Accept: `image/*,.pdf` (PDF also common for scanned IDs)
- Max 4MB (display friendly error if exceeded)
- Show filename preview after selection

**Submit:**
- Send as JSON (base64 file included in body) — consistent with `PropertyForm.tsx` pattern
- POST to `/api/application`

**Success view:**
- Replaces the form on the same page
- Shows a confirmation card with: applicant name, business name, email, mobile
- Message: "Your application has been received. We will review your details and get in touch within 1-2 business days."
- "Submit Another Application" link to reset

---

## Key Reused Utilities
- `api/src/lib/apiResponse.ts` — `ApiResponse.success()` / `ApiResponse.error()`
- `api/src/handlers/signup/handler.ts` — `streamToString()`, CSV append pattern, `S3Client` setup
- `lynxbox-ph/src/lib/utils.ts` — `convertFileToBase64()`, `validateImageFile()`

---

## Future Migration (DynamoDB)
When ready to migrate from S3 CSV to DynamoDB:
- Table: `applications` with `applicationId` (PK) and `timestamp` (SK)
- Move ID files to `applications/ids/` in S3 (already planned above)
- Add admin dashboard to view/manage applications

---

## Verification
1. Run local API server: `cd api && npm run local`
2. Run Next.js dev: `cd lynxbox-ph && npm run dev`
3. Navigate to `http://localhost:3001/business-address/application-form`
4. Fill form, upload a test image, submit
5. Check S3 (or local logs) for:
   - Row appended to `applications/applications.csv`
   - ID file saved to `applications/ids/`
6. Verify success screen shows submitted details
7. Verify no navigation bar appears on the page
