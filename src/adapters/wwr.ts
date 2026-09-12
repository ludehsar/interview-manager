import { parseRssItems } from './rss'
import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

function feedUrl(identifier: string): string {
  return `https://weworkremotely.com/categories/${encodeURIComponent(identifier)}.rss`
}

function splitTitle(raw: string): { company: string; title: string } {
  const [head, ...rest] = raw.split(':')
  if (rest.length === 0) return { company: '', title: raw.trim() }
  return { company: head.trim(), title: rest.join(':').trim() }
}

function externalIdFrom(link: string, guid: string): string {
  const fromLink = link.match(/\/remote-jobs\/([^/?#]+)/)
  if (fromLink) return fromLink[1]
  const digits = guid.match(/(\d+)\s*$/)
  return digits ? digits[1] : guid
}

export const wwrAdapter: Adapter = {
  kind: 'wwr',
  tier: 'B',
  hosts: ['weworkremotely.com'],
  minGapMs: 2000,

  probeUrl(source: SourceDefinition) {
    return feedUrl(source.identifier)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const xml = await ctx.http.getText(feedUrl(source.identifier))
    return parseRssItems(xml)
  },

  parse(payload: unknown[]): ParsedJob[] {
    return (payload as ReturnType<typeof parseRssItems>)
      .filter((item) => item.title && item.link)
      .map((item) => {
        const { company, title } = splitTitle(item.title)
        return {
          externalId: externalIdFrom(item.link, item.guid),
          title,
          company: company || 'Unknown',
          companyDomain: null,
          locationRaw: item.region ?? null,
          descriptionHtml: item.description || null,
          applyUrl: item.link,
          atsKind: 'wwr',
          postedAt: item.pubDate ? new Date(item.pubDate) : null,
          salary: null,
        }
      })
      .filter((job) => job.company !== 'Unknown')
  },
}
