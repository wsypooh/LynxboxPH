import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface HelpArticleMeta {
  slug: string
  title: string
  summary: string
  order: number
}

export interface HelpArticle extends HelpArticleMeta {
  body: string
}

const HELP_DIR = path.join(process.cwd(), 'content', 'help')

function readArticle(file: string): HelpArticle {
  const raw = fs.readFileSync(path.join(HELP_DIR, file), 'utf8')
  const { data, content } = matter(raw)
  return {
    slug: file.replace(/\.md$/, ''),
    title: String(data.title ?? file),
    summary: String(data.summary ?? ''),
    order: Number(data.order ?? 999),
    body: content,
  }
}

export function getAllHelpArticles(): HelpArticle[] {
  return fs
    .readdirSync(HELP_DIR)
    .filter(f => f.endsWith('.md'))
    .map(readArticle)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return getAllHelpArticles().find(a => a.slug === slug)
}
