import type { MetadataRoute } from 'next'
import { getStaticJobIds } from '@/lib/jobs-data'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? 'http://localhost:3000'
  const ids = await getStaticJobIds(5000)

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/jobs`, changeFrequency: 'hourly', priority: 0.9 },
    ...ids.map((id) => ({
      url: `${base}/jobs/${id}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ]
}
