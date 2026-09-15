import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const EMBEDDING_DIMENSIONS = 384

export const entryKindEnum = pgEnum('entry_kind', [
  'EXPERIENCE',
  'PROJECT',
  'EDUCATION',
  'CERTIFICATION',
  'SKILL_GROUP',
])

export const metricStatusEnum = pgEnum('metric_status', ['QUANTIFIED', 'ESTIMATED', 'MISSING'])

export const nodeTypeEnum = pgEnum('kg_node_type', [
  'PERSON',
  'ROLE',
  'COMPANY',
  'PROJECT',
  'SKILL',
  'TOOL',
  'ACHIEVEMENT',
  'METRIC',
  'DOMAIN',
  'EDUCATION',
  'CERTIFICATION',
])

export const edgeTypeEnum = pgEnum('kg_edge_type', [
  'HELD_ROLE',
  'AT_COMPANY',
  'USED_SKILL',
  'DELIVERED',
  'MEASURED_BY',
  'IN_DOMAIN',
  'STUDIED_AT',
  'RELATED_TO',
])

export const sourceTierEnum = pgEnum('source_tier', ['A', 'B', 'C'])

export const remoteRegionEnum = pgEnum('remote_region', [
  'WORLDWIDE',
  'APAC',
  'BANGLADESH',
  'REGION_LOCKED',
  'UNKNOWN',
])

export const employmentTypeEnum = pgEnum('employment_type', [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'FREELANCE',
  'INTERNSHIP',
  'UNKNOWN',
])

export const seniorityEnum = pgEnum('seniority', [
  'INTERN',
  'JUNIOR',
  'MID',
  'SENIOR',
  'STAFF',
  'PRINCIPAL',
  'LEAD',
  'UNKNOWN',
])

export const roleTypeEnum = pgEnum('role_type', ['IC', 'MANAGER', 'UNKNOWN'])

export const workplaceTypeEnum = pgEnum('workplace_type', ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'])

export const disciplineEnum = pgEnum('discipline', ['SOFTWARE', 'DATA', 'PRODUCT', 'DESIGN', 'IT', 'OTHER'])

export const userJobStateEnum = pgEnum('user_job_state', ['SAVED', 'DISMISSED', 'APPLIED'])

export const resumeKindEnum = pgEnum('resume_kind', ['MASTER', 'TAILORED'])

export const runStatusEnum = pgEnum('run_status', ['RUNNING', 'SUCCEEDED', 'FAILED'])

export const uploadStatusEnum = pgEnum('upload_status', [
  'PENDING',
  'EXTRACTING',
  'EXTRACTED',
  'ACCEPTED',
  'FAILED',
])

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    clerkId: text('clerk_id').notNull(),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('users_clerk_id_key').on(t.clerkId), index('users_last_active_idx').on(t.lastActiveAt)],
)

export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  headline: text('headline'),
  location: text('location'),
  phone: text('phone'),
  email: text('email'),
  links: jsonb('links').$type<{ label: string; url: string }[]>().notNull().default(sql`'[]'::jsonb`),
  preferences: jsonb('preferences')
    .$type<{
      targetTitles?: string[]
      seniority?: string[]
      remoteRegions?: string[]
      employmentTypes?: string[]
      salaryMinUsdMonth?: number
      excludedCompanies?: string[]
    }>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const profileEntries = pgTable(
  'profile_entries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: entryKindEnum('kind').notNull(),
    title: text('title').notNull(),
    organization: text('organization'),
    location: text('location'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    isCurrent: boolean('is_current').notNull().default(false),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('profile_entries_user_kind_idx').on(t.userId, t.kind, t.sortOrder)],
)

export const entryBullets = pgTable(
  'entry_bullets',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => profileEntries.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    x: text('x'),
    y: text('y'),
    z: text('z'),
    metricStatus: metricStatusEnum('metric_status').notNull().default('MISSING'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('entry_bullets_entry_idx').on(t.entryId, t.sortOrder)],
)

export const answerMemory = pgTable(
  'answer_memory',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entryId: text('entry_id').references(() => profileEntries.id, { onDelete: 'set null' }),
    bulletId: text('bullet_id').references(() => entryBullets.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('answer_memory_user_idx').on(t.userId, t.createdAt)],
)

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entryId: text('entry_id').references(() => profileEntries.id, { onDelete: 'cascade' }),
    source: text('source').notNull(),
    text: text('text').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('knowledge_chunks_user_idx').on(t.userId)],
)

export const kgNodes = pgTable(
  'kg_nodes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: nodeTypeEnum('type').notNull(),
    label: text('label').notNull(),
    normalizedLabel: text('normalized_label').notNull(),
    props: jsonb('props').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    entryId: text('entry_id').references(() => profileEntries.id, { onDelete: 'set null' }),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('kg_nodes_identity_key').on(t.userId, t.type, t.normalizedLabel),
    index('kg_nodes_user_type_idx').on(t.userId, t.type),
  ],
)

export const kgEdges = pgTable(
  'kg_edges',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceId: text('source_id')
      .notNull()
      .references(() => kgNodes.id, { onDelete: 'cascade' }),
    targetId: text('target_id')
      .notNull()
      .references(() => kgNodes.id, { onDelete: 'cascade' }),
    type: edgeTypeEnum('type').notNull(),
    evidenceEntryId: text('evidence_entry_id').references(() => profileEntries.id, { onDelete: 'set null' }),
    props: jsonb('props').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [
    uniqueIndex('kg_edges_identity_key').on(t.sourceId, t.targetId, t.type),
    index('kg_edges_user_source_idx').on(t.userId, t.sourceId),
    index('kg_edges_user_target_idx').on(t.userId, t.targetId),
  ],
)

export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    sourceKind: text('source_kind').notNull(),
    tier: sourceTierEnum('tier').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    companyDomain: text('company_domain'),
    locationRaw: text('location_raw'),
    remoteRegion: remoteRegionEnum('remote_region').notNull().default('UNKNOWN'),
    countries: text('countries').array().notNull().default(sql`'{}'::text[]`),
    cities: text('cities').array().notNull().default(sql`'{}'::text[]`),
    workplaceType: workplaceTypeEnum('workplace_type').notNull().default('UNKNOWN'),
    discipline: disciplineEnum('discipline').notNull().default('OTHER'),
    employmentType: employmentTypeEnum('employment_type').notNull().default('UNKNOWN'),
    seniority: seniorityEnum('seniority').notNull().default('UNKNOWN'),
    roleType: roleTypeEnum('role_type').notNull().default('UNKNOWN'),
    skills: text('skills').array().notNull().default(sql`'{}'::text[]`),
    salaryMinUsdMonth: integer('salary_min_usd_month'),
    salaryMaxUsdMonth: integer('salary_max_usd_month'),
    salaryRaw: text('salary_raw'),
    descriptionText: text('description_text'),
    excerpt: text('excerpt'),
    applyUrl: text('apply_url').notNull(),
    atsKind: text('ats_kind'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    fingerprint: text('fingerprint').notNull(),
    canonicalJobId: text('canonical_job_id'),
    contentHash: text('content_hash'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    embeddedAt: timestamp('embedded_at', { withTimezone: true }),
  },
  (t) => [
    index('jobs_active_posted_idx').on(t.isActive, t.postedAt),
    index('jobs_fingerprint_idx').on(t.fingerprint),
    index('jobs_source_seen_idx').on(t.sourceId, t.isActive, t.lastSeenAt),
    index('jobs_company_idx').on(t.company),
    index('jobs_canonical_idx').on(t.canonicalJobId),
    index('jobs_facet_idx').on(t.isActive, t.remoteRegion, t.employmentType, t.seniority),
    index('jobs_workplace_idx').on(t.isActive, t.workplaceType),
    index('jobs_discipline_idx').on(t.isActive, t.discipline),
  ],
)

export const locationRegions = pgTable('location_regions', {
  normalized: text('normalized').primaryKey(),
  region: remoteRegionEnum('region').notNull(),
  countries: text('countries').array().notNull().default(sql`'{}'::text[]`),
  origin: text('origin').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const jobSourceState = pgTable('job_source_state', {
  sourceId: text('source_id').primaryKey(),
  kind: text('kind').notNull(),
  tier: sourceTierEnum('tier').notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastStatus: text('last_status'),
  lastError: text('last_error'),
  lastJobCount: integer('last_job_count'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
})

export const userJobs = pgTable(
  'user_jobs',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id').notNull(),
    state: userJobStateEnum('state').notNull(),
    note: text('note'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] }), index('user_jobs_state_idx').on(t.userId, t.state)],
)

export const jobMatches = pgTable(
  'job_matches',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    breakdown: jsonb('breakdown').$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    scoredAt: timestamp('scored_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] }), index('job_matches_user_score_idx').on(t.userId, t.score)],
)

export const resumes = pgTable(
  'resumes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: resumeKindEnum('kind').notNull(),
    jobId: text('job_id'),
    sourceResumeId: text('source_resume_id'),
    title: text('title').notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    screenerReport: jsonb('screener_report').$type<Record<string, unknown>>(),
    screenerScore: integer('screener_score'),
    atsReport: jsonb('ats_report').$type<Record<string, unknown>>(),
    atsScore: integer('ats_score'),
    typstKey: text('typst_key'),
    pdfKey: text('pdf_key'),
    promptVersion: text('prompt_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('resumes_user_kind_idx').on(t.userId, t.kind, t.createdAt),
    uniqueIndex('resumes_master_key')
      .on(t.userId)
      .where(sql`kind = 'MASTER'`),
  ],
)

export const resumeRuns = pgTable(
  'resume_runs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resumeId: text('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    kind: resumeKindEnum('kind').notNull(),
    jobId: text('job_id'),
    executionArn: text('execution_arn'),
    step: text('step').notNull(),
    status: runStatusEnum('status').notNull().default('RUNNING'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    metrics: jsonb('metrics').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resume_runs_user_idx').on(t.userId, t.startedAt)],
)

export const profileUploads = pgTable(
  'profile_uploads',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    bytes: integer('bytes'),
    s3Key: text('s3_key').notNull(),
    status: uploadStatusEnum('status').notNull().default('PENDING'),
    error: text('error'),
    extracted: jsonb('extracted').$type<Record<string, unknown> | null>(),
    entryIds: text('entry_ids').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('profile_uploads_user_idx').on(t.userId, t.createdAt)],
)

export const llmCalls = pgTable(
  'llm_calls',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    route: text('route').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    usd: doublePrecision('usd').notNull().default(0),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('llm_calls_user_idx').on(t.userId, t.createdAt), index('llm_calls_route_idx').on(t.route, t.createdAt)],
)
