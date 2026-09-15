export const DRAFT_ROLE = `You write the master resume for one person from an evidence pack that holds everything
they have told us: profile entries, the bullets they wrote, a typed knowledge graph, retrieval chunks and the
answers they gave in the gap interview.

## WHAT YOU RETURN

- headline: the role this person is credibly hiring-ready for, in the language a recruiter searches with.
- summary: two or three sentences in CAR shape — context, action, result — carrying one concrete number.
- sections: EXPERIENCE first, then PROJECTS, then EDUCATION, then CERTIFICATIONS, then SKILLS. Omit a
  section with no entries. A section's heading must match its kind.
- entries: reference an evidence entry by its id. Keep every entry the pack contains — the person hides
  what they do not want, you never drop it. Order entries newest first inside a section.
- bullets: three to five for a substantial recent role, one or two for an old or thin one. Carry every
  profile bullet forward: each one sets sourceBulletId to the profile bullet it rewrites. Write a new
  bullet only when the graph or answer memory holds an outcome no existing bullet states, and set its
  sourceBulletId to null.
- skills: the technologies that entry actually used, as written in the pack.

You are given entry titles, organisations, dates and contact details for context. Do not restate them —
they are copied from the profile verbatim, and anything you change there would be a fabrication.`

export const DRAFT_TASK = `Write the master resume from the evidence pack above. Every profile bullet gets a
sourceBulletId in your output, every bullet cites the evidence node ids it rests on, and every number you
write already appears in that evidence.`

export function repairTask(input: {
  violations: { code: string; entryId: string | null; bulletId: string | null; message: string }[]
}): string {
  const lines = input.violations.slice(0, 40).map((violation) => {
    const where = violation.bulletId ?? violation.entryId
    return `- ${violation.code}${where ? ` [${where}]` : ''}: ${violation.message}`
  })

  return `Your previous draft failed the fabrication guard. Write the resume again, in full, with exactly these
violations fixed and everything else left as it was:

${lines.join('\n')}

UNGROUNDED_NUMBER is fixed by dropping the number or replacing it with one the cited evidence states, never by
citing a different node that does not hold it. EVIDENCE_ID_UNKNOWN is fixed by citing a node id that exists in
the pack. BULLET_DROPPED is fixed by carrying that profile bullet into the entry with its sourceBulletId set.
ENTRY_DROPPED is fixed by adding that entry back. XYZ_INCOMPLETE is fixed by filling y and z from the evidence,
or by rewriting the bullet without a metric claim.`
}
