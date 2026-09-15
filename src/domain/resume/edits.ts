import type { ResumeDocument } from '@/ai/schemas/resume'

export type ResumeEdit = {
  bulletId: string
  op: 'REPLACE_TEXT' | 'SET_XYZ' | 'REORDER' | 'DROP' | 'ADD_SKILL'
  text: string | null
  x: string | null
  y: string | null
  z: string | null
  rationale: string
}

export function applyEdits(doc: ResumeDocument, edits: ResumeEdit[]): ResumeDocument {
  const byBullet = new Map<string, ResumeEdit[]>()
  for (const edit of edits) {
    byBullet.set(edit.bulletId, [...(byBullet.get(edit.bulletId) ?? []), edit])
  }

  return {
    ...doc,
    sections: doc.sections.map((section) => ({
      ...section,
      entries: section.entries.map((entry) => ({
        ...entry,
        skills: [
          ...entry.skills,
          ...entry.bullets
            .flatMap((bullet) => byBullet.get(bullet.id) ?? [])
            .filter((edit) => edit.op === 'ADD_SKILL' && edit.text)
            .map((edit) => edit.text as string)
            .filter((skill) => !entry.skills.includes(skill)),
        ].slice(0, 20),
        bullets: entry.bullets.map((bullet) => {
          const applicable = byBullet.get(bullet.id) ?? []
          let next = bullet

          for (const edit of applicable) {
            if (edit.op === 'REPLACE_TEXT' && edit.text) next = { ...next, text: edit.text }
            if (edit.op === 'SET_XYZ') {
              next = {
                ...next,
                x: edit.x ?? next.x,
                y: edit.y ?? next.y,
                z: edit.z ?? next.z,
              }
            }
            if (edit.op === 'DROP') next = { ...next, hidden: true }
          }

          return next
        }),
      })),
    })),
  }
}

export function setHidden(
  doc: ResumeDocument,
  target: { sectionId?: string; entryId?: string; bulletId?: string },
  hidden: boolean,
): ResumeDocument {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (target.sectionId && section.id === target.sectionId) return { ...section, hidden }
      return {
        ...section,
        entries: section.entries.map((entry) => {
          if (target.entryId && entry.id === target.entryId) return { ...entry, hidden }
          return {
            ...entry,
            bullets: entry.bullets.map((bullet) =>
              target.bulletId && bullet.id === target.bulletId ? { ...bullet, hidden } : bullet,
            ),
          }
        }),
      }
    }),
  }
}
