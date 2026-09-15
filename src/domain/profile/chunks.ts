import type { EntryWithBullets } from './entries'

export function entryChunkText(entry: EntryWithBullets): string {
  const period = entry.isCurrent
    ? `${entry.startDate ?? 'unknown start'} to Present`
    : [entry.startDate, entry.endDate].filter(Boolean).join(' to ')

  const header = [entry.title, entry.organization, entry.location, period].filter(Boolean).join(' · ')
  const body = entry.bullets.map((bullet) => `- ${bullet.text}`).join('\n')
  const skills = entry.skills.length > 0 ? `Skills: ${entry.skills.join(', ')}` : ''

  return [header, entry.summary ?? '', skills, body].filter((part) => part !== '').join('\n')
}

export function buildChunks(entry: EntryWithBullets): { text: string; source: string }[] {
  const chunks: { text: string; source: string }[] = []
  const base = entryChunkText(entry)

  if (base.trim().length >= 40) chunks.push({ text: base.slice(0, 1200), source: 'entry' })

  for (const bullet of entry.bullets) {
    const context = [entry.title, entry.organization].filter(Boolean).join(' at ')
    const text = `${context}: ${bullet.text}${bullet.z ? ` (${bullet.z})` : ''}`
    if (text.length >= 40) chunks.push({ text: text.slice(0, 1200), source: `bullet:${bullet.id}` })
  }

  return chunks
}
