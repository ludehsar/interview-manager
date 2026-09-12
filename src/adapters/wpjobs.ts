import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type WpRendered = { rendered?: string }

type WpPost = {
  id?: number | string
  slug?: string
  link?: string
  date_gmt?: string
  date?: string
  modified_gmt?: string
  title?: WpRendered
  content?: WpRendered
  excerpt?: WpRendered
  status?: string
}

const PAGE_SIZE = 50

export function parseIdentifier(identifier: string): { host: string; postType: string } {
  const [host, postType] = identifier.split('|')
  return { host, postType: postType || 'awsm_job_openings' }
}

function listUrl(identifier: string, page: number): string {
  const { host, postType } = parseIdentifier(identifier)
  return `https://${host}/wp-json/wp/v2/${encodeURIComponent(postType)}?per_page=${PAGE_SIZE}&page=${page}&status=publish&orderby=date&order=desc`
}

function decode(value: string | undefined): string {
  if (!value) return ''
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export const wpJobsAdapter: Adapter = {
  kind: 'wpjobs',
  tier: 'A',
  hosts: [],
  minGapMs: 800,

  probeUrl(source: SourceDefinition) {
    return listUrl(source.identifier, 1)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const posts: WpPost[] = []
    for (let page = 1; page <= ctx.maxPages; page += 1) {
      let batch: WpPost[]
      try {
        batch = await ctx.http.getJson<WpPost[]>(listUrl(source.identifier, page))
      } catch {
        break
      }
      if (!Array.isArray(batch) || batch.length === 0) break
      posts.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return posts
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as WpPost[])
      .filter((post) => post?.id !== undefined && post.title?.rendered && post.link)
      .filter((post) => !post.status || post.status === 'publish')
      .map((post) => {
        const published = post.date_gmt ?? post.date ?? null
        return {
          externalId: String(post.id),
          title: decode(post.title?.rendered),
          company: source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? null,
          countryHint: source.countryHint ?? null,
          locationRaw: source.locationDefault ?? null,
          descriptionHtml: post.content?.rendered ?? post.excerpt?.rendered ?? null,
          applyUrl: post.link as string,
          atsKind: 'wpjobs',
          postedAt: published ? new Date(`${published.endsWith('Z') ? published : `${published}Z`}`) : null,
          salary: null,
        }
      })
  },
}
