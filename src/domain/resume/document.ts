import type { ResumeDraft } from '@/ai/schemas/draft'
import type { ResumeDocument, ResumeBullet, ResumeEntry, ResumeSection } from '@/ai/schemas/resume'
import { deriveMetricStatus } from '@/domain/profile/xyz'
import type { EvidencePack, EvidenceEntry } from './evidence'

function uniqueId(candidate: string, taken: Set<string>): string {
  if (!taken.has(candidate)) {
    taken.add(candidate)
    return candidate
  }

  let index = 2
  while (taken.has(`${candidate}_${index}`)) index += 1
  const id = `${candidate}_${index}`
  taken.add(id)
  return id
}

function bulletFrom(input: {
  draft: ResumeDraft['sections'][number]['entries'][number]['bullets'][number]
  entryId: string
  position: number
  taken: Set<string>
}): ResumeBullet {
  const base = input.draft.sourceBulletId
    ? `res_${input.draft.sourceBulletId}`
    : `res_${input.entryId}_n${input.position}`

  return {
    id: uniqueId(base, input.taken),
    sourceBulletId: input.draft.sourceBulletId,
    text: input.draft.text,
    x: input.draft.x,
    y: input.draft.y,
    z: input.draft.z,
    metricStatus: deriveMetricStatus({
      text: input.draft.text,
      x: input.draft.x,
      y: input.draft.y,
      z: input.draft.z,
    }),
    evidenceNodeIds: [...new Set(input.draft.evidenceNodeIds)],
    hidden: false,
  }
}

function entryFrom(input: {
  draft: ResumeDraft['sections'][number]['entries'][number]
  source: EvidenceEntry
  taken: Set<string>
}): ResumeEntry {
  const seenSources = new Set<string>()
  const bullets: ResumeBullet[] = []

  for (const bullet of input.draft.bullets) {
    if (bullet.sourceBulletId) {
      if (seenSources.has(bullet.sourceBulletId)) continue
      seenSources.add(bullet.sourceBulletId)
    }
    bullets.push(
      bulletFrom({ draft: bullet, entryId: input.source.id, position: bullets.length + 1, taken: input.taken }),
    )
  }

  return {
    id: uniqueId(`res_${input.source.id}`, input.taken),
    entryId: input.source.id,
    title: input.source.title,
    organization: input.source.organization,
    location: input.source.location,
    startDate: input.source.startDate,
    endDate: input.source.endDate,
    isCurrent: input.source.isCurrent,
    skills: [...new Set(input.draft.skills)].slice(0, 20),
    hidden: false,
    bullets,
  }
}

export function materializeDocument(draft: ResumeDraft, pack: EvidencePack): ResumeDocument {
  const sources = new Map(pack.entries.map((entry) => [entry.id, entry]))
  const taken = new Set<string>()
  const placed = new Set<string>()
  const sections: ResumeSection[] = []

  for (const section of draft.sections) {
    const entries: ResumeEntry[] = []

    for (const entry of section.entries) {
      const source = sources.get(entry.entryId)
      if (!source || placed.has(source.id)) continue
      placed.add(source.id)
      entries.push(entryFrom({ draft: entry, source, taken }))
    }

    if (entries.length === 0) continue
    sections.push({
      id: uniqueId(`sec_${section.heading.toLowerCase()}`, taken),
      kind: section.kind,
      heading: section.heading,
      hidden: false,
      entries,
    })
  }

  return {
    version: 1,
    basics: {
      fullName: pack.basics.fullName ?? '',
      headline: draft.headline || (pack.basics.headline ?? ''),
      location: pack.basics.location,
      email: pack.basics.email,
      phone: pack.basics.phone,
      links: pack.basics.links.slice(0, 6),
    },
    summary: {
      text: draft.summary.text,
      evidenceNodeIds: [...new Set(draft.summary.evidenceNodeIds)],
    },
    sections,
  }
}

export function serializeResume(doc: ResumeDocument): string {
  const out: string[] = []

  out.push(`# ${doc.basics.fullName} — ${doc.basics.headline}`)
  out.push([doc.basics.location, doc.basics.email, doc.basics.phone].filter(Boolean).join(' | '))
  for (const link of doc.basics.links) out.push(`${link.label}: ${link.url}`)
  out.push('')
  out.push('## SUMMARY')
  out.push(doc.summary.text)

  for (const section of doc.sections) {
    if (section.hidden) continue
    out.push('')
    out.push(`## ${section.heading}`)

    for (const entry of section.entries) {
      if (entry.hidden) continue
      const period = entry.isCurrent
        ? `${entry.startDate ?? ''} to Present`
        : `${entry.startDate ?? ''} to ${entry.endDate ?? ''}`
      out.push('')
      out.push([entry.title, entry.organization, entry.location, period].filter(Boolean).join(' | '))
      if (entry.skills.length > 0) out.push(`skills: ${entry.skills.join(', ')}`)

      for (const bullet of entry.bullets) {
        if (bullet.hidden) continue
        out.push(`- [${bullet.id}] ${bullet.text}`)
        out.push(`    x: ${bullet.x} | y: ${bullet.y} | z: ${bullet.z} | ${bullet.metricStatus}`)
        out.push(`    evidence: ${bullet.evidenceNodeIds.join(', ')}`)
      }
    }
  }

  return out.join('\n')
}
