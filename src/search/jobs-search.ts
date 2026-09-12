import {
  encodeCursor,
  type FacetBucket,
  type JobCursor,
  type JobFacets,
  type JobFilters,
  type JobPage,
} from '@/domain/jobs/filters'
import { TECH_DISCIPLINES } from '@/domain/jobs/discipline'
import { splitLocationTokens } from '@/domain/jobs/location'
import type { JobListItem } from '@/domain/jobs/types'
import { indexPath, searchRequest } from './client'
import type { JobDocument } from './jobs-index'

type Clause = Record<string, unknown>

type Hit = { _source: JobDocument; _score: number | null; sort?: (string | number)[] }

type SearchResponse = {
  hits: { total: { value: number }; hits: Hit[] }
  aggregations?: Record<string, { scoped?: { values?: { buckets: { key: string; doc_count: number }[] } } }>
}

const SKILL_FACET_SIZE = 200
const LOCATION_FACET_SIZE = 150

export function buildFilterClauses(filters: JobFilters, skip?: keyof JobFilters): Clause[] {
  const clauses: Clause[] = [
    { term: { isActive: true } },
    { bool: { must_not: { exists: { field: 'canonicalJobId' } } } },
    { terms: { discipline: TECH_DISCIPLINES } },
  ]

  if (filters.region?.length && skip !== 'region') {
    clauses.push({ terms: { remoteRegion: filters.region } })
  }
  if (filters.locations?.length && skip !== 'locations') {
    const { cities, countries } = splitLocationTokens(filters.locations)
    const should: Clause[] = []
    if (cities.length) should.push({ terms: { cities } })
    if (countries.length) should.push({ terms: { countries } })
    if (should.length) clauses.push({ bool: { should, minimum_should_match: 1 } })
  }
  if (filters.workplaceType?.length && skip !== 'workplaceType') {
    clauses.push({ terms: { workplaceType: filters.workplaceType } })
  }
  if (filters.employmentType?.length && skip !== 'employmentType') {
    clauses.push({ terms: { employmentType: filters.employmentType } })
  }
  if (filters.seniority?.length && skip !== 'seniority') {
    clauses.push({ terms: { seniority: filters.seniority } })
  }
  if (filters.roleType?.length && skip !== 'roleType') {
    clauses.push({ terms: { roleType: filters.roleType } })
  }
  if (filters.tier?.length && skip !== 'tier') {
    clauses.push({ terms: { tier: filters.tier } })
  }
  if (filters.skills?.length && skip !== 'skills') {
    for (const skill of filters.skills) clauses.push({ term: { skills: skill } })
  }
  if (filters.company && skip !== 'company') {
    clauses.push({ match_phrase_prefix: { company: filters.company } })
  }
  if (filters.salaryMinUsdMonth && skip !== 'salaryMinUsdMonth') {
    clauses.push({ range: { salaryMinUsdMonth: { gte: filters.salaryMinUsdMonth } } })
  }
  if (filters.postedWithinDays && skip !== 'postedWithinDays') {
    clauses.push({ range: { sortAt: { gte: `now-${filters.postedWithinDays}d` } } })
  }

  return clauses
}

function queryClause(filters: JobFilters, skip?: keyof JobFilters): Clause {
  const filter = buildFilterClauses(filters, skip)
  if (!filters.q || skip === 'q') return { bool: { filter } }

  return {
    bool: {
      filter,
      must: [
        {
          multi_match: {
            query: filters.q,
            fields: ['title^5', 'company^3', 'skills^3', 'excerpt^2', 'locationRaw', 'descriptionText'],
            type: 'best_fields',
            operator: 'and',
            fuzziness: 'AUTO',
          },
        },
      ],
    },
  }
}

function toListItem(document: JobDocument): JobListItem {
  return {
    id: document.id,
    title: document.title,
    company: document.company,
    companyDomain: document.companyDomain,
    locationRaw: document.locationRaw,
    remoteRegion: document.remoteRegion as JobListItem['remoteRegion'],
    cities: document.cities ?? [],
    countries: document.countries ?? [],
    workplaceType: document.workplaceType as JobListItem['workplaceType'],
    discipline: document.discipline as JobListItem['discipline'],
    employmentType: document.employmentType as JobListItem['employmentType'],
    seniority: document.seniority as JobListItem['seniority'],
    skills: document.skills ?? [],
    salaryMinUsdMonth: document.salaryMinUsdMonth,
    salaryMaxUsdMonth: document.salaryMaxUsdMonth,
    tier: document.tier as JobListItem['tier'],
    excerpt: document.excerpt,
    postedAt: document.postedAt ? new Date(document.postedAt) : null,
    sortAt: new Date(document.sortAt),
  }
}

function searchAfter(cursor: JobCursor | null, useRelevance: boolean): (string | number)[] | undefined {
  if (!cursor) return undefined
  const sortAt = new Date(cursor.t).getTime()
  return useRelevance ? [cursor.r as number, sortAt, cursor.i] : [sortAt, cursor.i]
}

export async function searchJobsIndex(
  filters: JobFilters,
  cursor: JobCursor | null,
  limit: number,
): Promise<JobPage> {
  const useRelevance = filters.sort === 'relevance' && Boolean(filters.q)
  const sort = useRelevance
    ? [{ _score: 'desc' }, { sortAt: 'desc' }, { id: 'desc' }]
    : [{ sortAt: 'desc' }, { id: 'desc' }]

  const response = await searchRequest<SearchResponse>('POST', indexPath('/_search'), {
    size: limit + 1,
    track_total_hits: false,
    query: queryClause(filters),
    sort,
    search_after: searchAfter(cursor, useRelevance),
    _source: {
      excludes: ['descriptionText'],
    },
  })

  const all = response.hits.hits
  const hasMore = all.length > limit
  const hits = hasMore ? all.slice(0, limit) : all
  const last = hits[hits.length - 1]

  return {
    items: hits.map((hit) => toListItem(hit._source)),
    nextCursor:
      hasMore && last
        ? encodeCursor({
            s: filters.sort,
            t: new Date(last._source.sortAt).toISOString(),
            i: last._source.id,
            ...(useRelevance ? { r: Number(last._score ?? 0) } : {}),
          })
        : null,
  }
}

export async function countJobsIndex(filters: JobFilters): Promise<number> {
  const response = await searchRequest<{ count: number }>('POST', indexPath('/_count'), {
    query: queryClause(filters),
  })
  return response.count
}

type FacetSpec = { name: string; field: string; skip: keyof JobFilters; size: number }

const FACET_SPECS: FacetSpec[] = [
  { name: 'region', field: 'remoteRegion', skip: 'region', size: 10 },
  { name: 'workplaceType', field: 'workplaceType', skip: 'workplaceType', size: 10 },
  { name: 'employmentType', field: 'employmentType', skip: 'employmentType', size: 10 },
  { name: 'seniority', field: 'seniority', skip: 'seniority', size: 10 },
  { name: 'skills', field: 'skills', skip: 'skills', size: SKILL_FACET_SIZE },
  { name: 'cities', field: 'cities', skip: 'locations', size: LOCATION_FACET_SIZE },
  { name: 'countries', field: 'countries', skip: 'locations', size: LOCATION_FACET_SIZE },
]

export async function loadFacetsIndex(filters: JobFilters): Promise<JobFacets> {
  const aggregations: Record<string, unknown> = {}
  for (const spec of FACET_SPECS) {
    aggregations[spec.name] = {
      global: {},
      aggs: {
        scoped: {
          filter: queryClause(filters, spec.skip),
          aggs: { values: { terms: { field: spec.field, size: spec.size } } },
        },
      },
    }
  }

  const response = await searchRequest<SearchResponse>('POST', indexPath('/_search'), {
    size: 0,
    query: queryClause(filters),
    aggs: aggregations,
  })

  const read = (name: string): FacetBucket[] =>
    (response.aggregations?.[name]?.scoped?.values?.buckets ?? []).map((bucket) => ({
      value: bucket.key,
      count: bucket.doc_count,
    }))

  const locations = [
    ...read('cities').map((bucket) => ({ value: `city:${bucket.value}`, count: bucket.count })),
    ...read('countries').map((bucket) => ({ value: `country:${bucket.value}`, count: bucket.count })),
  ].sort((a, b) => b.count - a.count)

  return {
    region: read('region'),
    locations,
    workplaceType: read('workplaceType'),
    employmentType: read('employmentType'),
    seniority: read('seniority'),
    skills: read('skills'),
  }
}
