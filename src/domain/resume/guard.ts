import { SKILLS } from '@/domain/jobs/skills-dictionary'
import { allBullets, visibleBullets, type ResumeDocument } from '@/ai/schemas/resume'
import type { EvidencePack } from './evidence'
import { extractNumbers, numbersSubsetOf, type NumberToken } from './numbers'

export type GuardCode =
  | 'EVIDENCE_ID_UNKNOWN'
  | 'EVIDENCE_MISSING'
  | 'UNGROUNDED_NUMBER'
  | 'ENTRY_DROPPED'
  | 'ENTRY_INVENTED'
  | 'ORG_INVENTED'
  | 'CONTACT_MISMATCH'
  | 'XYZ_INCOMPLETE'
  | 'BULLET_DROPPED'
  | 'UNEVIDENCED_ADJECTIVE'
  | 'BULLET_LENGTH'

export type GuardViolation = {
  code: GuardCode
  severity: 'error' | 'warn'
  entryId: string | null
  bulletId: string | null
  message: string
  detail?: Record<string, unknown>
}

export type GuardReport = {
  ok: boolean
  errors: number
  warnings: number
  violations: GuardViolation[]
}

const ERRORS = new Set<GuardCode>([
  'EVIDENCE_ID_UNKNOWN',
  'EVIDENCE_MISSING',
  'UNGROUNDED_NUMBER',
  'ENTRY_DROPPED',
  'ENTRY_INVENTED',
  'ORG_INVENTED',
  'CONTACT_MISMATCH',
  'XYZ_INCOMPLETE',
])

const PUFFERY = [
  'world-class',
  'best-in-class',
  'cutting-edge',
  'ninja',
  'rockstar',
  'guru',
  'synergy',
  'passionate',
  'results-driven',
  'seasoned',
  'visionary',
  'thought leader',
]

const MIN_BULLET = 60
const MAX_BULLET = 220

function techTokens(): Set<string> {
  const tokens = new Set<string>()
  for (const skill of SKILLS) {
    for (const name of [skill.canonical, ...skill.aliases]) {
      for (const part of name.toLowerCase().split(/[\s/]+/)) if (part) tokens.add(part)
    }
  }
  return tokens
}

function allowedNumbersFor(
  pack: EvidencePack,
  evidenceNodeIds: string[],
  sourceBulletId: string | null,
  entryId: string,
  tech: Set<string>,
): NumberToken[] {
  const tokens: NumberToken[] = []
  const nodes = new Map(pack.nodes.map((node) => [node.id, node]))

  for (const id of evidenceNodeIds) {
    const node = nodes.get(id)
    if (!node) continue
    tokens.push(...extractNumbers(node.label, tech))
    if (node.props.detail) tokens.push(...extractNumbers(node.props.detail, tech))
    if (typeof node.props.value === 'number') {
      tokens.push({ value: node.props.value, unit: node.props.unit, raw: String(node.props.value) })
    }
  }

  for (const answer of pack.answers) tokens.push(...extractNumbers(answer.answer, tech))

  const entry = pack.entries.find((candidate) => candidate.id === entryId)
  if (entry) {
    for (const date of [entry.startDate, entry.endDate]) {
      if (date) tokens.push(...extractNumbers(date, tech))
    }
    const source = sourceBulletId ? entry.bullets.find((bullet) => bullet.id === sourceBulletId) : null
    if (source) {
      for (const part of [source.text, source.x, source.y, source.z]) {
        if (part) tokens.push(...extractNumbers(part, tech))
      }
    }
  }

  return tokens
}

export function guardResume(doc: ResumeDocument, pack: EvidencePack): GuardReport {
  const violations: GuardViolation[] = []
  const tech = techTokens()
  const nodeIds = new Set(pack.nodes.map((node) => node.id))
  const entriesById = new Map(pack.entries.map((entry) => [entry.id, entry]))

  const add = (code: GuardCode, entryId: string | null, bulletId: string | null, message: string, detail?: Record<string, unknown>) => {
    violations.push({ code, severity: ERRORS.has(code) ? 'error' : 'warn', entryId, bulletId, message, detail })
  }

  const documentEntryIds = new Set<string>()
  for (const section of doc.sections) {
    for (const entry of section.entries) {
      documentEntryIds.add(entry.entryId)
      const source = entriesById.get(entry.entryId)
      if (!source) {
        add('ENTRY_INVENTED', entry.entryId, null, `Entry ${entry.title} is not in the profile`)
        continue
      }
      if (entry.organization && source.organization && entry.organization !== source.organization) {
        add('ORG_INVENTED', entry.entryId, null, `Organization changed from ${source.organization} to ${entry.organization}`)
      }
    }
  }

  for (const entry of pack.entries) {
    if (!documentEntryIds.has(entry.id)) {
      add('ENTRY_DROPPED', entry.id, null, `Entry ${entry.title} is missing from the resume`)
    }
  }

  if (pack.basics.fullName && doc.basics.fullName !== pack.basics.fullName) {
    add('CONTACT_MISMATCH', null, null, `Name on the resume is ${doc.basics.fullName}, profile says ${pack.basics.fullName}`)
  }
  if (pack.basics.email && doc.basics.email && doc.basics.email !== pack.basics.email) {
    add('CONTACT_MISMATCH', null, null, 'Email on the resume does not match the profile')
  }

  for (const { entry, bullet } of visibleBullets(doc)) {
    if (bullet.evidenceNodeIds.length === 0) {
      add('EVIDENCE_MISSING', entry.entryId, bullet.id, 'Bullet cites no evidence')
    }

    for (const id of bullet.evidenceNodeIds) {
      if (!nodeIds.has(id)) {
        add('EVIDENCE_ID_UNKNOWN', entry.entryId, bullet.id, `Bullet cites unknown evidence node ${id}`, { id })
      }
    }

    if (bullet.metricStatus === 'QUANTIFIED' && (bullet.y.trim() === '' || bullet.z.trim() === '')) {
      add('XYZ_INCOMPLETE', entry.entryId, bullet.id, 'Bullet claims a metric but leaves Y or Z empty')
    }

    const allowed = allowedNumbersFor(pack, bullet.evidenceNodeIds, bullet.sourceBulletId, entry.entryId, tech)
    const candidate = extractNumbers([bullet.text, bullet.x, bullet.y, bullet.z].join(' '), tech)
    for (const token of numbersSubsetOf(candidate, allowed)) {
      add('UNGROUNDED_NUMBER', entry.entryId, bullet.id, `${token.raw} does not appear in the cited evidence`, {
        value: token.value,
        unit: token.unit,
        raw: token.raw,
      })
    }

    const lower = bullet.text.toLowerCase()
    for (const word of PUFFERY) {
      if (lower.includes(word)) {
        add('UNEVIDENCED_ADJECTIVE', entry.entryId, bullet.id, `Bullet uses "${word}"`, { word })
      }
    }

    if (bullet.text.length < MIN_BULLET || bullet.text.length > MAX_BULLET) {
      add('BULLET_LENGTH', entry.entryId, bullet.id, `Bullet is ${bullet.text.length} characters`, {
        length: bullet.text.length,
      })
    }
  }

  const usedSourceIds = new Set(
    allBullets(doc)
      .map(({ bullet }) => bullet.sourceBulletId)
      .filter((id): id is string => Boolean(id)),
  )
  for (const entry of pack.entries) {
    for (const bullet of entry.bullets) {
      if (!usedSourceIds.has(bullet.id)) {
        add('BULLET_DROPPED', entry.id, bullet.id, `Profile bullet "${bullet.text.slice(0, 40)}" was not carried over`)
      }
    }
  }

  const errors = violations.filter((violation) => violation.severity === 'error').length
  return { ok: errors === 0, errors, warnings: violations.length - errors, violations }
}
