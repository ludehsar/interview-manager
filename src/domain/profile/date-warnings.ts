export type DatedEntry = {
  title: string
  organization?: string | null
  startDate?: string | null
  endDate?: string | null
  isCurrent?: boolean
}

const MONTH = /^(\d{4})(?:-(\d{2}))?$/

function months(value: string | null | undefined): number | null {
  if (!value) return null
  const match = MONTH.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 12 + (match[2] ? Number(match[2]) - 1 : 0)
}

function label(entry: DatedEntry): string {
  return entry.organization ? `${entry.title} at ${entry.organization}` : entry.title
}

export function dateWarnings(entries: DatedEntry[], today: Date = new Date()): string[] {
  const now = today.getUTCFullYear() * 12 + today.getUTCMonth()
  const warnings: string[] = []

  for (const entry of entries) {
    const start = months(entry.startDate)
    const end = months(entry.endDate)

    if (start !== null && start > now) {
      warnings.push(`${label(entry)} starts on ${entry.startDate}, which has not happened yet.`)
    }
    if (end !== null && end > now) {
      warnings.push(`${label(entry)} ends on ${entry.endDate}, which has not happened yet.`)
    }
    if (start !== null && end !== null && end < start) {
      warnings.push(`${label(entry)} ends on ${entry.endDate}, before it starts on ${entry.startDate}.`)
    }
    if (entry.isCurrent && entry.endDate) {
      warnings.push(`${label(entry)} is marked current but also lists an end date of ${entry.endDate}.`)
    }
  }

  return warnings
}
