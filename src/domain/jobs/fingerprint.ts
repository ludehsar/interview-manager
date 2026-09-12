import { sha256 } from '@/lib/ids'

const LEGAL_SUFFIXES =
  /\b(incorporated|inc|llc|ltd|limited|gmbh|bv|pty|plc|corp|corporation|co|sa|sas|ab|oy|as|srl|sro|kk|pte|pvt|holdings|group|technologies|technology|labs)\b/g

const GENDER_MARKERS = /\b([mfwdx]\s*[/|]\s*){1,3}[mfwdx]\b|\ball genders\b/g

const REMOTE_TOKENS =
  /\b(fully remote|remote first|remote|worldwide|anywhere|work from home|wfh|hybrid|onsite|on-site)\b/g

const DIACRITICS = /[̀-ͯ]/g

const EMOJI = /[\u{1f000}-\u{1ffff}\u{2600}-\u{27bf}\u{fe0f}]/gu

export function jobId(sourceKind: string, identifier: string, externalId: string): string {
  return sha256(`${sourceKind}:${identifier}:${externalId}`)
}

export function normalizeCompany(company: string): string {
  return company
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(EMOJI, ' ')
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ')
    .replace(/#\d+/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(GENDER_MARKERS, ' ')
    .replace(REMOTE_TOKENS, ' ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function dedupeFingerprint(company: string, title: string): string {
  return sha256(`${normalizeCompany(company)}|${normalizeTitle(title)}`)
}

export function contentHash(parts: (string | number | null | undefined)[]): string {
  return sha256(parts.map((part) => (part === null || part === undefined ? '' : String(part))).join('|~|'))
}
