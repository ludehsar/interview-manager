import { decodeEntities } from '@/domain/jobs/text'

export type RssItem = {
  title: string
  link: string
  guid: string
  description: string
  pubDate: string | null
  region: string | null
  category: string | null
}

function tagValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!match) return null
  const raw = match[1].trim()
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return decodeEntities(cdata ? cdata[1] : raw).trim()
}

export function parseRssItems(xml: string): RssItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []
  return blocks.map((block) => {
    const link = tagValue(block, 'link') ?? ''
    return {
      title: tagValue(block, 'title') ?? '',
      link,
      guid: tagValue(block, 'guid') ?? link,
      description: tagValue(block, 'description') ?? '',
      pubDate: tagValue(block, 'pubDate'),
      region: tagValue(block, 'region'),
      category: tagValue(block, 'category'),
    }
  })
}
