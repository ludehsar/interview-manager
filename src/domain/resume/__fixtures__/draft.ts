import type { ResumeDraft } from '@/ai/schemas/draft'

export function resumeDraft(): ResumeDraft {
  return {
    headline: 'Senior Backend Engineer',
    summary: {
      text: 'Backend engineer focused on latency and reliability.',
      evidenceNodeIds: ['kgn_role'],
    },
    sections: [
      {
        kind: 'EXPERIENCE',
        heading: 'EXPERIENCE',
        entries: [
          {
            entryId: 'ent_a',
            skills: ['PostgreSQL', 'TypeScript'],
            bullets: [
              {
                sourceBulletId: 'blt_1',
                text: 'Cut checkout p95 latency from 900 ms to 240 ms by moving session reads to Redis',
                x: 'Moved session reads to Redis',
                y: '240 ms p95',
                z: 'for 1.2M monthly users',
                evidenceNodeIds: ['kgn_metric', 'kgn_scale'],
              },
            ],
          },
        ],
      },
    ],
  }
}
