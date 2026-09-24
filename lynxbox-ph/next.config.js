/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only static-export for the real production build (`next build`, uploaded to
  // S3/CloudFront per infra/) — not `next dev`. With this always on, `next dev` enforced
  // the same "every dynamic route needs every param in generateStaticParams()" constraint
  // as the real export, so a hard refresh or direct URL paste on any [param] route (e.g.
  // dashboard/tenants/[id], dashboard/platform-admin/accounts/[accountId]) would error,
  // since this repo's convention only ever registers a placeholder param (see CLAUDE.md's
  // static-export section) and relies on client-side navigation reading the real one from
  // the URL at runtime. `next build` remains the authoritative static-export correctness
  // check either way — tsc/lint already don't catch this class of issue.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    // Disable image optimization when using static export + S3/CloudFront
    unoptimized: true,
  },
}

module.exports = nextConfig;
