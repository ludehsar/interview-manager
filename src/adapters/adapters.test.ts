import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import amazonFixture from './__fixtures__/amazon.json'
import arbeitnowFixture from './__fixtures__/arbeitnow.json'
import ashbyFixture from './__fixtures__/ashby.json'
import bdjobsFixture from './__fixtures__/bdjobs.json'
import eightfoldFixture from './__fixtures__/eightfold.json'
import greenhouseFixture from './__fixtures__/greenhouse.json'
import himalayasFixture from './__fixtures__/himalayas.json'
import jobicyFixture from './__fixtures__/jobicy.json'
import leverFixture from './__fixtures__/lever.json'
import remoteokFixture from './__fixtures__/remoteok.json'
import remotiveFixture from './__fixtures__/remotive.json'
import smartrecruitersFixture from './__fixtures__/smartrecruiters.json'
import successfactorsFixture from './__fixtures__/successfactors.json'
import successfactorsHtml from './__fixtures__/successfactors-html.json'
import workableFixture from './__fixtures__/workable.json'
import wpjobsFixture from './__fixtures__/wpjobs.json'
import workdayFixture from './__fixtures__/workday.json'
import workingnomadsFixture from './__fixtures__/workingnomads.json'
import { queryFor } from './bdjobs'
import { parseDescription, parseSearchRows } from './successfactors'
import { getAdapter } from './registry'
import { workdayLocation } from './workday'
import { parseRssItems } from './rss'
import type { AdapterKind, SourceDefinition } from './types'

function source(kind: AdapterKind, identifier: string, tier: SourceDefinition['tier']): SourceDefinition {
  return {
    id: `${kind}:${identifier}`,
    kind,
    tier,
    identifier,
    label: 'Fixture Co',
    companyOverride: tier === 'A' ? 'Fixture Co' : undefined,
    intervalMinutes: 60,
    enabled: true,
  }
}

const cases: { kind: AdapterKind; tier: SourceDefinition['tier']; payload: unknown[] }[] = [
  { kind: 'greenhouse', tier: 'A', payload: greenhouseFixture as unknown[] },
  { kind: 'lever', tier: 'A', payload: leverFixture as unknown[] },
  { kind: 'ashby', tier: 'A', payload: ashbyFixture as unknown[] },
  { kind: 'workable', tier: 'A', payload: workableFixture as unknown[] },
  { kind: 'smartrecruiters', tier: 'A', payload: smartrecruitersFixture as unknown[] },
  { kind: 'amazon', tier: 'A', payload: amazonFixture as unknown[] },
  { kind: 'remotive', tier: 'B', payload: remotiveFixture as unknown[] },
  { kind: 'himalayas', tier: 'B', payload: himalayasFixture as unknown[] },
  { kind: 'workingnomads', tier: 'B', payload: workingnomadsFixture as unknown[] },
  { kind: 'arbeitnow', tier: 'C', payload: arbeitnowFixture as unknown[] },
  { kind: 'jobicy', tier: 'C', payload: jobicyFixture as unknown[] },
  { kind: 'remoteok', tier: 'C', payload: remoteokFixture as unknown[] },
  { kind: 'bdjobs', tier: 'B', payload: bdjobsFixture as unknown[] },
  { kind: 'wpjobs', tier: 'A', payload: wpjobsFixture as unknown[] },
  { kind: 'successfactors', tier: 'A', payload: successfactorsFixture as unknown[] },
]

describe.each(cases)('$kind adapter', ({ kind, tier, payload }) => {
  const adapter = getAdapter(kind)
  const parsed = adapter.parse(payload, source(kind, 'fixture', tier))

  it('parses every posting in the fixture', () => {
    expect(parsed.length).toBe(payload.length)
  })

  it('produces the fields the normalizer needs', () => {
    for (const job of parsed) {
      expect(typeof job.externalId).toBe('string')
      expect(job.externalId.length).toBeGreaterThan(0)
      expect(job.title.trim().length).toBeGreaterThan(0)
      expect(job.company.trim().length).toBeGreaterThan(0)
      expect(job.applyUrl).toMatch(/^https?:\/\//)
      if (job.postedAt) expect(Number.isNaN(job.postedAt.getTime())).toBe(false)
    }
  })

  it('carries a description', () => {
    const withText = parsed.filter((job) => job.descriptionHtml || job.descriptionText)
    expect(withText.length).toBeGreaterThan(0)
  })
})

describe('wwr adapter', () => {
  const adapter = getAdapter('wwr')
  const xml = readFileSync(join('src', 'adapters', '__fixtures__', 'wwr.json'), 'utf8')
  const items = JSON.parse(xml) as ReturnType<typeof parseRssItems>
  const parsed = adapter.parse(items, source('wwr', 'remote-programming-jobs', 'B'))

  it('splits company and title out of the rss title', () => {
    expect(parsed.length).toBeGreaterThan(0)
    for (const job of parsed) {
      expect(job.company.length).toBeGreaterThan(0)
      expect(job.title.length).toBeGreaterThan(0)
      expect(job.title).not.toContain(job.company)
      expect(job.applyUrl).toMatch(/^https:\/\/weworkremotely\.com\//)
    }
  })
})

describe('parseRssItems', () => {
  it('reads cdata and entities', () => {
    const items = parseRssItems(
      `<rss><channel><item><title><![CDATA[Acme: Senior Engineer]]></title>` +
        `<link>https://example.com/remote-jobs/senior-engineer</link>` +
        `<description>Build &amp; ship</description><region>Worldwide</region>` +
        `<pubDate>Tue, 01 Sep 2026 10:00:00 +0000</pubDate></item></channel></rss>`,
    )
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Acme: Senior Engineer')
    expect(items[0].description).toBe('Build & ship')
    expect(items[0].region).toBe('Worldwide')
  })
})

describe('workday adapter', () => {
  const adapter = getAdapter('workday')
  const workdaySource: SourceDefinition = {
    ...source('workday', 'nvidia|wd5|NVIDIAExternalCareerSite', 'A'),
    label: 'NVIDIA',
    companyOverride: 'NVIDIA',
    companyDomain: 'nvidia.com',
  }
  const parsed = adapter.parse(workdayFixture as unknown[], workdaySource)

  it('uses the requisition id rather than the url path', () => {
    expect(parsed.length).toBe((workdayFixture as unknown[]).length)
    for (const job of parsed) {
      expect(job.externalId).toMatch(/^[A-Za-z0-9-]+$/)
      expect(job.applyUrl).toMatch(/^https:\/\/nvidia\.wd5\.myworkdayjobs\.com\//)
      expect(job.company).toBe('NVIDIA')
    }
  })

  it('rejects a malformed identifier instead of building a broken url', () => {
    expect(adapter.parse(workdayFixture as unknown[], source('workday', 'nvidia', 'A'))).toEqual([])
  })
})

describe('eightfold adapter', () => {
  const adapter = getAdapter('eightfold')
  const netflixSource: SourceDefinition = {
    ...source('eightfold', 'explore.jobs.netflix.net|netflix.com', 'A'),
    label: 'Netflix',
    companyOverride: 'Netflix',
    companyDomain: 'netflix.com',
  }
  const parsed = adapter.parse(eightfoldFixture as unknown[], netflixSource)

  it('parses positions with canonical apply urls', () => {
    expect(parsed.length).toBeGreaterThan(0)
    for (const job of parsed) {
      expect(job.applyUrl).toMatch(/^https?:\/\//)
      expect(job.company).toBe('Netflix')
      expect(job.externalId.length).toBeGreaterThan(0)
    }
  })

  it('rejects a malformed identifier', () => {
    expect(adapter.parse(eightfoldFixture as unknown[], source('eightfold', 'netflix', 'A'))).toEqual([])
  })
})

describe('workday location', () => {
  it('ignores the "N Locations" summary so a real location can survive', () => {
    expect(workdayLocation({ locationsText: '2 Locations' })).toBeNull()
    expect(workdayLocation({ locationsText: '12 locations' })).toBeNull()
    expect(workdayLocation({ locationsText: 'US, CA, Santa Clara' })).toBe('US, CA, Santa Clara')
    expect(workdayLocation({ location: 'US, CA, Remote', locationsText: '5 Locations' })).toBe('US, CA, Remote')
    expect(workdayLocation({})).toBeNull()
  })
})

describe('bdjobs adapter', () => {
  const adapter = getAdapter('bdjobs')
  const parsed = adapter.parse(bdjobsFixture as unknown[], source('bdjobs', 'category:8', 'B'))

  it('links to the public job detail page', () => {
    for (const job of parsed) {
      expect(job.applyUrl).toBe(`https://jobs.bdjobs.com/jobdetails/?id=${job.externalId}&ln=1`)
    }
  })

  it('keeps every posting in Bangladesh and carries the workplace hint', () => {
    for (const job of parsed) {
      expect(job.countryHint).toBe('BD')
      expect(job.locationRaw).toBeTruthy()
    }
    expect(parsed.some((job) => job.workplaceRaw)).toBe(true)
  })

  it('reads the published salary as monthly taka', () => {
    const withSalary = parsed.filter((job) => job.salary?.min || job.salary?.max)
    expect(withSalary.length).toBeGreaterThan(0)
    for (const job of withSalary) {
      expect(job.salary?.currency).toBe('BDT')
      expect(job.salary?.period).toBe('MONTH')
    }
  })

  it('builds a query string only for a recognised identifier', () => {
    expect(queryFor('all')).toBe('')
    expect(queryFor('category:8')).toBe('&category=8')
    expect(queryFor('location:14')).toBe('&location=14')
    expect(queryFor('nonsense')).toBe('')
  })
})

describe('successfactors adapter', () => {
  it('reads title, location, date and id out of the search table', () => {
    const rows = parseSearchRows(successfactorsHtml.searchRows)
    expect(rows.length).toBe(3)
    expect(rows[0]).toMatchObject({
      externalId: '1348821355',
      title: 'Sales Development Representative - Swedish Speaker',
      location: 'Amsterdam, NL, 102',
      date: 'Sep 11, 2026',
    })
    for (const row of rows) {
      expect(row.path).toMatch(/^\/job\/.+\/\d+\/$/)
      expect(row.externalId).toMatch(/^\d+$/)
    }
  })

  it('extracts the whole description span, which does not close before a div', () => {
    const description = parseDescription(successfactorsHtml.jobPage)
    expect(description).toBeTruthy()
    expect((description as string).length).toBeGreaterThan(1000)
    expect(description).toContain('Optimizely')
    expect(description).not.toContain('jobGeoLocation')
  })

  it('returns null when the page carries no description', () => {
    expect(parseDescription('<div class="job"><p>nothing here</p></div>')).toBeNull()
  })
})

describe('wpjobs adapter', () => {
  const adapter = getAdapter('wpjobs')
  const wpSource = {
    ...source('wpjobs', 'careers.pathao.com|awsm_job_openings', 'A'),
    locationDefault: 'Dhaka, Bangladesh',
    countryHint: 'BD',
  }
  const parsed = adapter.parse(wpjobsFixture as unknown[], wpSource)

  it('uses the declared location and country, since WordPress posts carry neither', () => {
    for (const job of parsed) {
      expect(job.locationRaw).toBe('Dhaka, Bangladesh')
      expect(job.countryHint).toBe('BD')
      expect(job.applyUrl).toMatch(/^https:\/\//)
    }
  })

  it('decodes entities in the rendered title', () => {
    for (const job of parsed) expect(job.title).not.toMatch(/&#\d+;|&amp;/)
  })
})
