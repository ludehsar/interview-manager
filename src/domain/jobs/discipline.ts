import type { Discipline } from './types'

export const TECH_DISCIPLINES: Discipline[] = ['SOFTWARE', 'DATA', 'PRODUCT', 'DESIGN', 'IT']

const STRONG: [RegExp, Discipline][] = [
  [
    /\b(software|application|apps?|systems?|platform|backend|back[- ]end|frontend|front[- ]end|full[- ]?stack|web|mobile|android|ios|game|embedded|firmware|blockchain|api)\s+(engineer|engineering|developer|development|programmer|architect)\b/,
    'SOFTWARE',
  ],
  [/\b(software|web|game|mobile|android|ios|python|java|php|\.net|dotnet|node|react|angular|vue|ruby|golang|rust|laravel|wordpress)\s+(developer|programmer|engineer)\b/, 'SOFTWARE'],
  [/\b(sde|swe|sdet)\b/, 'SOFTWARE'],
  [/\b(devops|dev[- ]?sec[- ]?ops|site reliability|sre|release engineer|build engineer|infrastructure engineer)\b/, 'SOFTWARE'],
  [/\b(qa|quality assurance|test|testing)\s+(engineer|automation|analyst|lead|specialist)\b/, 'SOFTWARE'],
  [/\b(automation|test)\s+(qa|engineer)\b/, 'SOFTWARE'],
  [/\b(engineering|technical|tech|software|platform|application)\s+(manager|lead|director|head|vp)\b/, 'SOFTWARE'],
  [/\bsoftware development\s+(manager|lead|director|head|vp)\b/, 'SOFTWARE'],
  [/\b(engineering|development|software|platform|qa|test|data|devops)\s+team lead\b/, 'SOFTWARE'],
  [/\b(cto|chief technology officer|chief technical officer)\b/, 'SOFTWARE'],
  [/\b(solutions?|cloud|security|integration|enterprise|technical)\s+architect\b/, 'SOFTWARE'],
  [/\b(programmer|developer)\b/, 'SOFTWARE'],

  [/\b(data|analytics|ml|ai|machine learning|deep learning|nlp|computer vision)\s+(engineer|scientist|architect)\b/, 'DATA'],
  [/\b(machine learning|deep learning|artificial intelligence|data science|mlops)\b/, 'DATA'],
  [/\b(data analyst|business intelligence|bi developer|bi analyst|analytics engineer)\b/, 'DATA'],

  [/\b(product|program|project|delivery|technical product)\s+(manager|owner|management)\b/, 'PRODUCT'],
  [/\b(chief product officer|cpo|head of product|vp,? product|vice president,? product|director,? product)\b/, 'PRODUCT'],
  [/\b(scrum master|agile coach|product analyst|business analyst|systems analyst)\b/, 'PRODUCT'],

  [/\b(ux|ui|ux\/ui|ui\/ux|product|interaction|experience|design systems?)\s+(designer|design|researcher)\b/, 'DESIGN'],
  [/\b(user experience|user interface|product design)\b/, 'DESIGN'],

  [/\b(system|network|database|cloud|security|it|integration|middleware|infrastructure)\s+(administrator|admin|engineer|specialist|analyst)\b/, 'IT'],
  [/\b(sysadmin|dba|devsecops|cyber ?security|information security|penetration test|soc analyst)\b/, 'IT'],
  [/\b(technical support engineer|support engineer|it support)\b/, 'IT'],
]

const NON_TECH_FIELD =
  /\b(civil|structural|mechanical|electrical|electronics|chemical|industrial|textile|garment|apparel|knitting|dyeing|weaving|marine|mining|petroleum|automobile|automotive|agricultur\w*|hvac|piping|welding|boiler|survey|construction)\b/

const NON_TECH =
  /\b(account(s|ant|ing)?|audit(or|ing)?|finance|financial|tax(ation)?|treasury|bookkeep\w*|payroll|billing|credit|loan|insurance|underwrit\w*|actuar\w*|teller|cashier|banking|branch manager|relationship manager|wealth|investment|equity research|compliance|aml)\b/

const NON_TECH_ROLES = [
  /\b(human resources?|hr|people|talent acquisition|recruit\w*|hiring|payroll)\b/,
  /\b(admin|administrative|office management|office assistant|receptionist|front desk|secretar\w*|peon|clerk|typist|data entry|computer operator)\b/,
  /\b(sales|telesales|telemarket\w*|business development|bd executive|territory|dealer|distribut\w*|merchandis\w*|retail|showroom|counter)\b/,
  /\b(marketing|brand|seo specialist|content writer|copywriter|social media|public relations|advertis\w*|media buyer|event)\b/,
  /\b(customer (service|care|support|relation|success)|call cent(er|re)|csr|front office|guest relation)\b/,
  /\b(partnerships?|alliances?|enablement|gtm|go[- ]to[- ]market|controllers?|community manager|subject matter expert|growth)\b/,
  /\b(civil|structural|mechanical|electrical|electronics|chemical|industrial|textile|garment|apparel|knitting|dyeing|marine|mining|petroleum|automobile|automotive|agricultur\w*|food|production|maintenance|hvac|piping|welding|boiler|survey|site|field|plant|factory)\s+(engineer|technician|supervisor|officer|manager|operator|inspector)\b/,
  /\b(architect)\b(?!.*\b(software|solutions?|cloud|security|data|enterprise|technical|integration|systems?)\b)/,
  /\b(doctor|physician|nurse|medical officer|pharmac\w*|dental|therapist|lab technician|radiolog\w*)\b/,
  /\b(teacher|lecturer|instructor|professor|principal|tutor|faculty|academic)\b/,
  /\b(lawyer|advocate|legal|paralegal|notary)\b/,
  /\b(driver|rider|delivery man|courier|chef|cook|waiter|steward|housekeep\w*|cleaner|gardener|caregiver|nanny|guard|security officer|imam|beautician|tailor|carpenter|electrician|plumber|mason|technician)\b/,
  /\b(procurement|purchase|supply chain|logistics|warehouse|inventory|store keeper|shipping|freight|customs|import|export)\b/,
  /\b(operations? (officer|executive|assistant)|general manager|managing director|coordinator|facilit\w*|estate|land|real estate)\b/,
]

const WEAK: [RegExp, Discipline][] = [
  [/\b(engineer|engineering)\b/, 'SOFTWARE'],
  [/\b(data|analytics)\b/, 'DATA'],
  [/\b(designer|design)\b/, 'DESIGN'],
  [/\b(it|information technology|technology|technical)\b/, 'IT'],
]

const TECH_SKILL_FLOOR = 2

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function classifyDiscipline(title: string, skills: string[] = []): Discipline {
  const normalized = normalizeTitle(title)
  if (!normalized) return 'OTHER'

  for (const [pattern, discipline] of STRONG) {
    if (pattern.test(normalized)) return discipline
  }

  if (NON_TECH_FIELD.test(normalized) || NON_TECH.test(normalized)) return 'OTHER'
  for (const pattern of NON_TECH_ROLES) {
    if (pattern.test(normalized)) return 'OTHER'
  }

  for (const [pattern, discipline] of WEAK) {
    if (pattern.test(normalized)) return discipline
  }

  return skills.length >= TECH_SKILL_FLOOR ? 'SOFTWARE' : 'OTHER'
}

export function isTechDiscipline(discipline: Discipline): boolean {
  return discipline !== 'OTHER'
}
