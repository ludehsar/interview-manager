import type { EvidencePack } from '../evidence'

export function evidencePack(): EvidencePack {
  return {
    version: 1,
    basics: {
      fullName: 'Rashedul Alam',
      headline: 'Senior Backend Engineer',
      location: 'Dhaka, Bangladesh',
      email: 'me@example.com',
      phone: '+880 1700 000000',
      links: [{ label: 'GitHub', url: 'https://github.com/example' }],
    },
    entries: [
      {
        id: 'ent_a',
        kind: 'EXPERIENCE',
        title: 'Senior Backend Engineer',
        organization: 'Acme',
        location: 'Remote',
        startDate: '2022-03',
        endDate: null,
        isCurrent: true,
        skills: ['PostgreSQL', 'TypeScript'],
        summary: null,
        bullets: [
          {
            id: 'blt_1',
            text: 'Cut checkout p95 latency from 900 ms to 240 ms',
            x: 'Moved session reads to Redis',
            y: '240 ms p95',
            z: 'for 1.2M monthly users',
            metricStatus: 'QUANTIFIED',
          },
        ],
      },
    ],
    nodes: [
      {
        id: 'kgn_metric',
        type: 'METRIC',
        label: '240 ms p95',
        props: { value: 240, unit: 'ms', period: null, detail: 'cut checkout p95 from 900 ms to 240 ms' },
      },
      {
        id: 'kgn_scale',
        type: 'METRIC',
        label: '1.2M monthly users',
        props: { value: 1200000, unit: 'users', period: 'monthly', detail: null },
      },
      { id: 'kgn_role', type: 'ROLE', label: 'Senior Backend Engineer', props: { value: null, unit: null, period: null, detail: null } },
    ],
    edges: [{ sourceId: 'kgn_role', type: 'MEASURED_BY', targetId: 'kgn_metric' }],
    chunks: [{ id: 'knc_1', source: 'entry', text: 'Senior Backend Engineer at Acme, cut p95 to 240 ms.' }],
    answers: [],
  }
}
