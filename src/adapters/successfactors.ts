import { jobId } from '@/domain/jobs/fingerprint'
import { decodeEntities } from '@/domain/jobs/text'
import type { ParsedJob } from '@/domain/jobs/types'
import type { Adapter, AdapterContext, SourceDefinition } from './types'

export type SuccessFactorsRow = {
  externalId: string
  title: string
  location: string | null
  date: string | null
  path: string
  description?: string | null
}

const PAGE_SIZE = 25
const MAX_DETAIL_FETCHES = 40

function listUrl(host: string, startRow: number): string {
  return `https://${host}/search/?q=&startrow=${startRow}`
}

function clean(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function matchOne(block: string, pattern: RegExp): string | null {
  const match = block.match(pattern)
  return match ? clean(match[1]) : null
}

export function parseSearchRows(html: string): SuccessFactorsRow[] {
  const blocks = html.match(/<tr class="data-row[\s\S]*?<\/tr>/g) ?? []
  const rows: SuccessFactorsRow[] = []

  for (const block of blocks) {
    const link = block.match(/<a[^>]+class="jobTitle-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    const anchor = link ?? block.match(/<a[^>]+href="(\/job\/[^"]+)"[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/)
    if (!anchor) continue

    const path = decodeEntities(anchor[1])
    const title = clean(anchor[2])
    const externalId = path.match(/\/(\d+)\/?$/)?.[1]
    if (!externalId || !title) continue

    rows.push({
      externalId,
      title,
      location: matchOne(block, /<span class="jobLocation">([\s\S]*?)<\/span>/),
      date: matchOne(block, /<span class="jobDate">([\s\S]*?)<\/span>/),
      path,
    })
  }

  return rows
}

export function parseDescription(html: string): string | null {
  const open = html.match(/<span[^>]*class="[^"]*jobdescription[^"]*"[^>]*>/)
  if (!open || open.index === undefined) return null

  const start = open.index + open[0].length
  const tag = /<\/?span\b[^>]*>/g
  tag.lastIndex = start

  let depth = 1
  let match: RegExpExecArray | null
  while ((match = tag.exec(html)) !== null) {
    depth += match[0].startsWith('</') ? -1 : 1
    if (depth === 0) {
      const body = html.slice(start, match.index).trim()
      return body || null
    }
  }

  return null
}

function totalFrom(html: string): number | null {
  const match = html.match(/of\s+([\d,]+)\s*<\/span>/) ?? html.match(/paginationLabel[^>]*>[^<]*of\s+([\d,]+)/)
  if (!match) return null
  const total = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(total) ? total : null
}

function postedAt(date: string | null): Date | null {
  if (!date) return null
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const successFactorsAdapter: Adapter = {
  kind: 'successfactors',
  tier: 'A',
  hosts: [],
  minGapMs: 900,

  probeUrl(source: SourceDefinition) {
    return listUrl(source.identifier, 0)
  },

  async fetchRaw(source: SourceDefinition, ctx: AdapterContext) {
    const host = source.identifier
    const rows: SuccessFactorsRow[] = []
    let declaredTotal: number | null = null

    for (let page = 0; page < ctx.maxPages; page += 1) {
      const html = await ctx.http.getText(listUrl(host, page * PAGE_SIZE))
      const batch = parseSearchRows(html)
      rows.push(...batch)
      if (declaredTotal === null) declaredTotal = totalFrom(html)
      if (batch.length < PAGE_SIZE) break
      if (declaredTotal !== null && rows.length >= declaredTotal) break
    }

    const known = ctx.knownExternalIds
    const needsDetail = rows
      .filter((row) => !known || !known.has(jobId('successfactors', host, row.externalId)))
      .slice(0, MAX_DETAIL_FETCHES)

    for (const row of needsDetail) {
      try {
        const html = await ctx.http.getText(`https://${host}${row.path}`)
        row.description = parseDescription(html)
      } catch {
        continue
      }
    }

    return rows
  },

  parse(payload: unknown[], source: SourceDefinition): ParsedJob[] {
    return (payload as SuccessFactorsRow[])
      .filter((row) => row?.externalId && row.title)
      .map((row) => ({
        externalId: row.externalId,
        title: row.title,
        company: source.companyOverride ?? source.label,
        companyDomain: source.companyDomain ?? null,
        countryHint: source.countryHint ?? null,
        locationRaw: row.location ?? source.locationDefault ?? null,
        descriptionHtml: row.description ?? null,
        applyUrl: `https://${source.identifier}${row.path}`,
        atsKind: 'successfactors',
        postedAt: postedAt(row.date),
        salary: null,
      }))
  },
}
