import { config } from 'dotenv'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

type Args = { userId: string | null; keep: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { userId: null, keep: false }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === '--user') args.userId = argv[++index] ?? null
    else if (flag === '--keep') args.keep = true
  }

  return args
}

const SEED = [
  {
    entry: {
      kind: 'EXPERIENCE' as const,
      title: 'Senior Platform Engineer',
      organization: 'Northwind Systems',
      location: 'Remote',
      startDate: '2022-03',
      endDate: null,
      isCurrent: true,
      skills: ['Kubernetes', 'Go', 'Terraform'],
      summary: 'Owned the multi-tenant Kubernetes platform serving 40 product teams.',
    },
    bullets: [
      {
        text: 'Rebuilt cluster autoscaling on Karpenter, cutting compute spend 38% while holding p99 scheduling latency under 20s.',
        x: 'Rebuilt cluster autoscaling on Karpenter',
        y: 'compute spend down 38%',
        z: 'p99 scheduling latency under 20s',
      },
      {
        text: 'Migrated 120 services from Helm to Terraform-managed manifests with zero customer-visible downtime.',
        x: 'Migrated 120 services to Terraform-managed manifests',
        y: 'zero downtime',
        z: 'across 120 services',
      },
    ],
  },
  {
    entry: {
      kind: 'EXPERIENCE' as const,
      title: 'Data Engineer',
      organization: 'Harbor Analytics',
      location: 'Singapore',
      startDate: '2019-06',
      endDate: '2022-02',
      isCurrent: false,
      skills: ['Python', 'Airflow', 'Postgres'],
      summary: 'Built the ingestion layer behind the customer-facing analytics product.',
    },
    bullets: [
      {
        text: 'Cut nightly ETL runtime from 6h to 45m by rewriting the Airflow DAGs around incremental Postgres CDC.',
        x: 'Rewrote Airflow DAGs around incremental CDC',
        y: 'runtime 6h to 45m',
        z: 'nightly ETL for 2TB of events',
      },
    ],
  },
  {
    entry: {
      kind: 'PROJECT' as const,
      title: 'Typst resume renderer',
      organization: null,
      location: null,
      startDate: '2024-01',
      endDate: '2024-04',
      isCurrent: false,
      skills: ['Rust', 'Typst', 'AWS Lambda'],
      summary: 'A deterministic PDF renderer packaged as an arm64 Lambda.',
    },
    bullets: [
      {
        text: 'Shipped an arm64 Lambda that renders ATS-parseable PDFs in under 400ms cold start.',
        x: 'Shipped an arm64 Typst render Lambda',
        y: 'under 400ms cold start',
        z: 'ATS-parseable text layer',
      },
    ],
  },
]

const PROBES = [
  { query: 'kubernetes autoscaling cost reduction', expect: 'Karpenter' },
  { query: 'slow nightly data pipeline made faster', expect: 'Airflow' },
  { query: 'rust pdf rendering on lambda', expect: 'Typst' },
]

function line(name: string, detail: string) {
  console.log(`${name.padEnd(16)} ${detail}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const { and, eq, inArray } = await import('drizzle-orm')
  const { closeDatabase, db } = await import('@/db/client')
  const { kgEdges, kgNodes, users } = await import('@/db/schema')
  const { buildChunks } = await import('@/domain/profile/chunks')
  const { deleteEntry, insertEntry, listEntries, upsertBullet } = await import('@/domain/profile/entries')
  const {
    chunksMissingEmbeddings,
    nodesMissingEmbeddings,
    replaceChunks,
    upsertEdges,
    upsertNodes,
    writeChunkEmbeddings,
    writeNodeEmbeddings,
  } = await import('@/domain/profile/kg')
  const { normalizeLabel } = await import('@/domain/profile/normalize-label')
  const { entrySchema } = await import('@/domain/profile/schema')
  const { buildEvidencePack, serializeEvidencePack } = await import('@/domain/resume/evidence')
  const { expandOneHop, searchChunks, searchNodes } = await import('@/domain/resume/retrieval')
  const { embedTexts } = await import('@/ai/embeddings')

  let userId = args.userId
  if (!userId) {
    const [row] = await db().select({ id: users.id }).from(users).limit(1)
    if (!row) throw new Error('no user in the database, pass --user')
    userId = row.id
  }
  line('user', userId)

  const entryIds: string[] = []
  const nodeIds: string[] = []
  let failures = 0

  try {
    for (const seed of SEED) {
      const entryId = await insertEntry(userId, entrySchema.parse(seed.entry))
      entryIds.push(entryId)
      for (const bullet of seed.bullets) await upsertBullet(userId, { entryId, ...bullet })
    }

    const entries = (await listEntries(userId)).filter((entry) => entryIds.includes(entry.id))
    let chunks = 0
    for (const entry of entries) chunks += (await replaceChunks(userId, entry.id, buildChunks(entry))).length
    line('seeded', `${entries.length} entries, ${chunks} chunks`)

    const anchor = entries.find((entry) => entry.title === SEED[0].entry.title)
    if (!anchor) throw new Error('seed entry missing after insert')

    const props = { value: null, unit: null, period: null, detail: null }
    const keys = await upsertNodes(userId, [
      { type: 'SKILL', label: 'Kubernetes', props, entryId: anchor.id },
      { type: 'SKILL', label: 'Karpenter', props, entryId: anchor.id },
      { type: 'COMPANY', label: 'Northwind Systems', props, entryId: anchor.id },
      {
        type: 'METRIC',
        label: 'compute spend reduced 38%',
        props: { value: 38, unit: '%', period: null, detail: 'autoscaling rebuild' },
        entryId: anchor.id,
      },
    ])
    nodeIds.push(...keys.values())

    const key = (type: string, label: string) => {
      const id = keys.get(`${type}:${normalizeLabel(label)}`)
      if (!id) throw new Error(`node ${type}:${label} was not upserted`)
      return id
    }
    const kubernetes = key('SKILL', 'Kubernetes')
    const edges = await upsertEdges(userId, [
      { sourceId: kubernetes, targetId: key('SKILL', 'Karpenter'), type: 'RELATED_TO', evidenceEntryId: anchor.id },
      {
        sourceId: kubernetes,
        targetId: key('METRIC', 'compute spend reduced 38%'),
        type: 'MEASURED_BY',
        evidenceEntryId: anchor.id,
      },
      {
        sourceId: key('COMPANY', 'Northwind Systems'),
        targetId: kubernetes,
        type: 'USED_SKILL',
        evidenceEntryId: anchor.id,
      },
    ])
    line('graph', `${nodeIds.length} nodes, ${edges} edges`)

    const pendingChunks = await chunksMissingEmbeddings(userId)
    const chunkVectors = await embedTexts(pendingChunks.map((row) => row.text))
    const embeddedChunks = await writeChunkEmbeddings(
      pendingChunks.map((row, index) => ({ id: row.id, embedding: chunkVectors[index] })),
    )
    const pendingNodes = await nodesMissingEmbeddings(userId)
    const nodeVectors = await embedTexts(pendingNodes.map((row) => row.text))
    const embeddedNodes = await writeNodeEmbeddings(
      pendingNodes.map((row, index) => ({ id: row.id, embedding: nodeVectors[index] })),
    )
    line('embeddings', `${embeddedChunks} chunks, ${embeddedNodes} nodes`)

    for (const probe of PROBES) {
      const [top] = await searchChunks({ userId, query: probe.query, limit: 5 })
      const hit = Boolean(top && top.text.includes(probe.expect))
      if (!hit) failures += 1
      line(hit ? 'hybrid ok' : 'hybrid MISS', `"${probe.query}" -> ${top ? top.text.slice(0, 64) : 'no hit'}`)
    }

    const seededNodes = new Set(nodeIds)
    const nodes = (await searchNodes({ userId, query: 'container orchestration', limit: 200 })).filter((node) =>
      seededNodes.has(node.id),
    )
    const nearestNode = nodes[0]
    if (!nearestNode || nearestNode.label !== 'Kubernetes') failures += 1
    line(
      nearestNode?.label === 'Kubernetes' ? 'nodes ok' : 'nodes MISS',
      nodes.map((node) => `${node.label} ${node.distance.toFixed(3)}`).join(' | ') || 'no hit',
    )

    const hop = await expandOneHop(userId, [kubernetes])
    if (hop.length !== 4) failures += 1
    line(hop.length === 4 ? 'one hop ok' : 'one hop MISS', `${hop.length} nodes reached from Kubernetes, expected 4`)

    const pack = await buildEvidencePack({ userId, query: 'platform engineering role', k: 12 })
    const packed = entries.every((entry) => pack.entries.some((row) => row.id === entry.id))
    if (!packed) failures += 1
    line(
      packed ? 'pack ok' : 'pack MISS',
      `${pack.entries.length} entries, ${pack.nodes.length} nodes, ${serializeEvidencePack(pack).length} chars`,
    )
  } finally {
    if (!args.keep) {
      if (nodeIds.length > 0) {
        await db().delete(kgEdges).where(and(eq(kgEdges.userId, userId), inArray(kgEdges.sourceId, nodeIds)))
        await db().delete(kgNodes).where(and(eq(kgNodes.userId, userId), inArray(kgNodes.id, nodeIds)))
      }
      for (const id of entryIds) await deleteEntry(userId, id)
      line('cleanup', `${entryIds.length} entries, ${nodeIds.length} nodes removed`)
    } else {
      line('kept', `${entryIds.length} entries, ${nodeIds.length} nodes left in place`)
    }
    await closeDatabase().catch(() => {})
  }

  if (failures > 0) {
    console.error(`${failures} check(s) failed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
