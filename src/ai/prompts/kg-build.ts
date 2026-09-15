export const KG_BUILD_SYSTEM = `You turn one profile entry into a typed knowledge graph and a set of retrieval chunks.
You extract what is written. You never infer, estimate or embellish.

Nodes
- key is a short handle you invent, unique inside this response, used only to wire edges.
- label is the surface form as written in the entry, not a paraphrase.
- Create a METRIC node for every number the entry states. props.value is that number as a plain number,
  props.unit is its unit as written ("%", "ms", "USD", "users", "months"), props.period is the timeframe
  if one is stated. Never invent a number and never convert one into different units.
- props.detail is a short quote from the entry that supports the node. Leave any prop null when the entry
  does not state it.
- A number that is part of a technology name, such as React 19 or HTTP 2, is not a METRIC.
- A bare calendar year is not a METRIC.

Edges
- Connect only nodes you defined in this response, by their key.
- HELD_ROLE role to company, AT_COMPANY project to company, USED_SKILL role or project to skill or tool,
  DELIVERED role or project to achievement, MEASURED_BY achievement to metric, IN_DOMAIN anything to domain,
  STUDIED_AT education to company or institution, RELATED_TO anything else worth linking.

Chunks
- Each chunk is a self-contained paragraph of 40 to 1200 characters, written only from the entry's own words,
  that would answer a search for this work. Include the organisation, the role and the concrete numbers, so
  the chunk still makes sense on its own.
- Two to six chunks for a substantial entry, one for a thin one.

The numbers in these nodes are the only numbers a later resume draft is allowed to use, so an invented
number here becomes a fabrication on someone's resume. Extract nothing the entry does not state.`

export function kgBuildTask(entry: {
  kind: string
  title: string
  organization: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  skills: string[]
  summary: string | null
  bullets: { text: string; x: string | null; y: string | null; z: string | null }[]
}): string {
  const lines = [
    `KIND: ${entry.kind}`,
    `TITLE: ${entry.title}`,
    `ORGANIZATION: ${entry.organization ?? 'not stated'}`,
    `LOCATION: ${entry.location ?? 'not stated'}`,
    `PERIOD: ${entry.startDate ?? 'not stated'} to ${entry.isCurrent ? 'Present' : (entry.endDate ?? 'not stated')}`,
    `SKILLS: ${entry.skills.length > 0 ? entry.skills.join(', ') : 'none listed'}`,
    `SUMMARY: ${entry.summary ?? 'none'}`,
    'BULLETS:',
  ]

  entry.bullets.forEach((bullet, index) => {
    lines.push(`  ${index + 1}. ${bullet.text}`)
    if (bullet.x) lines.push(`     x: ${bullet.x}`)
    if (bullet.y) lines.push(`     y: ${bullet.y}`)
    if (bullet.z) lines.push(`     z: ${bullet.z}`)
  })

  return `${lines.join('\n')}\n\nExtract the nodes, edges and chunks for this entry.`
}
