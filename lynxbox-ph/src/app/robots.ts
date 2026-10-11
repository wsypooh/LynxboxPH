import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

// Sandbox is kept out of search by an X-Robots-Tag header (infra/modules/frontend/main.tf),
// not here — the static export is the same build for every environment.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/auth/'] },
    sitemap: 'https://lynxbox.ph/sitemap.xml',
  }
}
