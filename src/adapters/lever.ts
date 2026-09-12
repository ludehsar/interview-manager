import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

type LeverPosting = {
  id?: string
  text?: string
  hostedUrl?: string
  applyUrl?: string
  descriptionPlain?: string
  description?: string
  createdAt?: number
  categories?: { location?: string; commitment?: string; team?: string }
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string }
  lists?: { text?: string; content?: string }[]
}

const PAGE_SIZE = 100

function pageUrl(identifier: string, skip: number): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(identifier)}?mode=json&limit=${PAGE_SIZE}&skip=${skip}`
}

export const leverAdapter: Adapter = {
  kind: 'lever',
  tier: 'A',
  hosts: ['api.lever.co'],
  minGapMs: 500,

  probeUrl(source: SourceDefinition) {
    return pageUrl(source.identifier, 0)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const all: LeverPosting[] = []
    for (let page = 0; page < ctx.maxPages; page += 1) {
      const batch = await ctx.http.getJson<LeverPosting[]>(pageUrl(source.identifier, page * PAGE_SIZE))
      if (!Array.isArray(batch) || batch.length === 0) break
      all.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return all
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as LeverPosting[])
      .filter((posting) => posting?.id && posting.text)
      .map((posting) => {
        const body = [posting.descriptionPlain ?? posting.description ?? '']
          .concat((posting.lists ?? []).map((list) => `${list.text ?? ''}\n${list.content ?? ''}`))
          .join('\n')
        return {
          externalId: posting.id as string,
          title: posting.text as string,
          company: source.companyOverride ?? source.label,
          companyDomain: source.companyDomain ?? null,
          locationRaw: posting.categories?.location ?? null,
          employmentType: undefined,
          descriptionHtml: posting.descriptionPlain ? null : body,
          descriptionText: posting.descriptionPlain ? body : null,
          applyUrl: posting.hostedUrl ?? posting.applyUrl ?? '',
          atsKind: 'lever',
          postedAt: posting.createdAt ? new Date(posting.createdAt) : null,
          salary: posting.salaryRange
            ? {
                min: posting.salaryRange.min ?? null,
                max: posting.salaryRange.max ?? null,
                currency: posting.salaryRange.currency ?? null,
                period: posting.salaryRange.interval ?? null,
              }
            : null,
        }
      })
      .filter((job) => job.applyUrl.length > 0)
  },
}
