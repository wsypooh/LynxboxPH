import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HelpLayout } from '@/components/help/HelpLayout'
import { getAllHelpArticles, getHelpArticle } from '@/lib/help'

export function generateStaticParams() {
  return getAllHelpArticles().map(a => ({ slug: a.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getHelpArticle(params.slug)
  return article ? { title: `${article.title} | Lynxbox PH Help`, description: article.summary } : {}
}

export default function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = getHelpArticle(params.slug)
  if (!article) notFound()
  const nav = getAllHelpArticles().map(({ slug, title, summary }) => ({ slug, title, summary }))
  return <HelpLayout nav={nav} activeSlug={article.slug} title={article.title} body={article.body} />
}
