import type { MetadataRoute } from 'next'
import { getAllHelpArticles } from '@/lib/help'

export const dynamic = 'force-static'

const SITE_URL = 'https://lynxbox.ph'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/properties', '/pricing', '/contact', '/help']
  return [
    ...pages.map(path => ({ url: `${SITE_URL}${path === '/' ? '' : path}` })),
    ...getAllHelpArticles().map(a => ({ url: `${SITE_URL}/help/${a.slug}` })),
  ]
}
