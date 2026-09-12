import type { JobInsert } from '@/domain/jobs/types'
import { indexPath, searchRequest, SearchError } from './client'

export type JobDocument = {
  id: string
  sourceId: string
  sourceKind: string
  tier: string
  title: string
  company: string
  companyDomain: string | null
  locationRaw: string | null
  remoteRegion: string
  countries: string[]
  cities: string[]
  workplaceType: string
  discipline: string
  employmentType: string
  seniority: string
  roleType: string
  skills: string[]
  salaryMinUsdMonth: number | null
  salaryMaxUsdMonth: number | null
  excerpt: string | null
  descriptionText: string | null
  applyUrl: string
  postedAt: string | null
  firstSeenAt: string
  sortAt: string
  isActive: boolean
  canonicalJobId: string | null
}

const KEYWORD = { type: 'keyword' as const }

export const JOBS_MAPPING = {
  settings: {
    index: {
      number_of_shards: 1,
      number_of_replicas: 0,
      'mapping.total_fields.limit': 200,
    },
    analysis: {
      analyzer: {
        job_text: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
      },
      filter: {
        english_stop: { type: 'stop', stopwords: '_english_' },
        english_stemmer: { type: 'stemmer', language: 'english' },
      },
    },
  },
  mappings: {
    dynamic: 'strict',
    properties: {
      id: KEYWORD,
      sourceId: KEYWORD,
      sourceKind: KEYWORD,
      tier: KEYWORD,
      title: { type: 'text', analyzer: 'job_text', fields: { raw: KEYWORD } },
      company: { type: 'text', analyzer: 'job_text', fields: { raw: KEYWORD } },
      companyDomain: KEYWORD,
      locationRaw: { type: 'text', analyzer: 'job_text', fields: { raw: KEYWORD } },
      remoteRegion: KEYWORD,
      countries: KEYWORD,
      cities: KEYWORD,
      workplaceType: KEYWORD,
      discipline: KEYWORD,
      employmentType: KEYWORD,
      seniority: KEYWORD,
      roleType: KEYWORD,
      skills: KEYWORD,
      salaryMinUsdMonth: { type: 'integer' },
      salaryMaxUsdMonth: { type: 'integer' },
      excerpt: { type: 'text', analyzer: 'job_text' },
      descriptionText: { type: 'text', analyzer: 'job_text' },
      applyUrl: KEYWORD,
      postedAt: { type: 'date' },
      firstSeenAt: { type: 'date' },
      sortAt: { type: 'date' },
      isActive: { type: 'boolean' },
      canonicalJobId: KEYWORD,
    },
  },
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export function toDocument(row: JobInsert): JobDocument {
  const firstSeenAt = iso(row.firstSeenAt) ?? new Date().toISOString()
  const postedAt = iso(row.postedAt)

  return {
    id: row.id as string,
    sourceId: row.sourceId,
    sourceKind: row.sourceKind,
    tier: row.tier,
    title: row.title,
    company: row.company,
    companyDomain: row.companyDomain ?? null,
    locationRaw: row.locationRaw ?? null,
    remoteRegion: row.remoteRegion ?? 'UNKNOWN',
    countries: row.countries ?? [],
    cities: row.cities ?? [],
    workplaceType: row.workplaceType ?? 'UNKNOWN',
    discipline: row.discipline ?? 'OTHER',
    employmentType: row.employmentType ?? 'UNKNOWN',
    seniority: row.seniority ?? 'UNKNOWN',
    roleType: row.roleType ?? 'UNKNOWN',
    skills: row.skills ?? [],
    salaryMinUsdMonth: row.salaryMinUsdMonth ?? null,
    salaryMaxUsdMonth: row.salaryMaxUsdMonth ?? null,
    excerpt: row.excerpt ?? null,
    descriptionText: row.descriptionText ?? null,
    applyUrl: row.applyUrl,
    postedAt,
    firstSeenAt,
    sortAt: postedAt ?? firstSeenAt,
    isActive: row.isActive ?? true,
    canonicalJobId: row.canonicalJobId ?? null,
  }
}

export async function indexExists(): Promise<boolean> {
  try {
    await searchRequest('HEAD', indexPath())
    return true
  } catch (error) {
    if (error instanceof SearchError && error.status === 404) return false
    throw error
  }
}

export async function ensureJobsIndex(): Promise<boolean> {
  if (await indexExists()) return false
  await searchRequest('PUT', indexPath(), JOBS_MAPPING)
  return true
}

export async function dropJobsIndex(): Promise<void> {
  try {
    await searchRequest('DELETE', indexPath())
  } catch (error) {
    if (error instanceof SearchError && error.status === 404) return
    throw error
  }
}

type BulkResponse = { errors?: boolean; items?: { index?: { error?: { reason?: string } } }[] }

export async function indexDocuments(documents: JobDocument[]): Promise<number> {
  if (documents.length === 0) return 0

  const lines: string[] = []
  for (const document of documents) {
    lines.push(JSON.stringify({ index: { _id: document.id } }))
    lines.push(JSON.stringify(document))
  }

  const response = await searchRequest<BulkResponse>(
    'POST',
    indexPath('/_bulk'),
    `${lines.join('\n')}\n`,
    'application/x-ndjson',
  )

  if (response.errors) {
    const reason = response.items?.find((item) => item.index?.error)?.index?.error?.reason
    throw new SearchError(`bulk index failed: ${reason ?? 'unknown'}`, 0, '')
  }

  return documents.length
}

export async function indexJobRows(rows: JobInsert[]): Promise<number> {
  return indexDocuments(rows.map(toDocument))
}

export async function deleteJobDocuments(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const lines = ids.map((id) => JSON.stringify({ delete: { _id: id } }))
  await searchRequest<BulkResponse>(
    'POST',
    indexPath('/_bulk'),
    `${lines.join('\n')}\n`,
    'application/x-ndjson',
  )
  return ids.length
}

export async function refreshJobsIndex(): Promise<void> {
  await searchRequest('POST', indexPath('/_refresh'))
}
