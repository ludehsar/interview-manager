import { SKILLS } from './skills-dictionary'

const BOUNDARY_BEFORE = '(?<![a-z0-9+#])(?<![a-z0-9]\\.)'
const BOUNDARY_AFTER = '(?![a-z0-9+#])(?!\\.[a-z0-9])'

const CONTEXTUAL: [string, RegExp][] = [
  [
    'Go',
    /\b(written|coded|built|developed|implemented|programming|experience|proficient|fluent|skills?)\b[^.]{0,40}(?<![a-z0-9+#])(?<![a-z0-9]\.)go(?![a-z0-9+#])(?!\.[a-z0-9])/,
  ],
  ['Go', /(?<![a-z0-9+#])(?<![a-z0-9]\.)go(?![a-z0-9+#])(?!\.[a-z0-9])[^.]{0,20}\b(developer|engineer|programming|microservices|backend|lang)\b/],
  ['Rust', /(?<![a-z0-9+#])(?<![a-z0-9]\.)rust(?![a-z0-9+#])(?!\.[a-z0-9])(?!\s+belt)/],
]

function escape(alias: string): string {
  return alias.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&')
}

const MATCHERS: [string, RegExp][] = SKILLS.flatMap((skill) =>
  skill.aliases.map(
    (alias) => [skill.canonical, new RegExp(`${BOUNDARY_BEFORE}${escape(alias)}${BOUNDARY_AFTER}`)] as [string, RegExp],
  ),
)

export function extractSkills(title: string, description?: string | null, max = 25): string[] {
  const haystack = `${title}\n${description ?? ''}`.toLowerCase().replace(/\s+/g, ' ')
  if (!haystack.trim()) return []

  const found = new Set<string>()
  for (const [canonical, pattern] of MATCHERS) {
    if (found.has(canonical)) continue
    if (pattern.test(haystack)) found.add(canonical)
  }
  for (const [canonical, pattern] of CONTEXTUAL) {
    if (found.has(canonical)) continue
    if (pattern.test(haystack)) found.add(canonical)
  }

  return [...found].slice(0, max)
}
