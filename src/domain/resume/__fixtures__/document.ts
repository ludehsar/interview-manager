import type { ResumeDocument } from '@/ai/schemas/resume'

export function resumeDocument(): ResumeDocument {
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
    summary: { text: 'Backend engineer focused on latency and reliability.', evidenceNodeIds: ['kgn_role'] },
    sections: [
      {
        id: 'sec_experience',
        kind: 'EXPERIENCE',
        heading: 'EXPERIENCE',
        hidden: false,
        entries: [
          {
            id: 'res_ent_a',
            entryId: 'ent_a',
            title: 'Senior Backend Engineer',
            organization: 'Acme',
            location: 'Remote',
            startDate: '2022-03',
            endDate: null,
            isCurrent: true,
            skills: ['PostgreSQL', 'TypeScript'],
            hidden: false,
            bullets: [
              {
                id: 'res_blt_1',
                sourceBulletId: 'blt_1',
                text: 'Cut checkout p95 latency from 900 ms to 240 ms by moving session reads to Redis',
                x: 'Moved session reads to Redis',
                y: '240 ms p95',
                z: 'for 1.2M monthly users',
                metricStatus: 'QUANTIFIED',
                evidenceNodeIds: ['kgn_metric', 'kgn_scale'],
                hidden: false,
              },
            ],
          },
        ],
      },
    ],
  }
}
