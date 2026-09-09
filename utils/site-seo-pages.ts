/**
 * Registry of site page types the AI SEO agent can manage site-wide, plus the
 * template helpers shared by the Nuxt app (useSiteSeo) and the server (audit,
 * apply). Templates use `{placeholder}` tokens listed in `vars` for each page.
 */

export type SiteSeoPageKey =
  | 'home'
  | 'venues'
  | 'events'
  | 'counties'
  | 'news'
  | 'map'
  | 'pub-crawls'
  | 'search'
  | 'town'
  | 'county'
  | 'venue'
  | 'event'
  | 'news-article'
  | 'stadium'

export type SiteSeoPageDefinition = {
  key: SiteSeoPageKey
  label: string
  route: string
  /** Rough number of URLs this page type produces (for the audit's context). */
  scale: 'single' | 'hundreds' | 'thousands' | 'tens_of_thousands'
  vars: string[]
  /** Which template fields make sense for this page. */
  supports: Array<'title' | 'description' | 'keywords' | 'intro' | 'linkTitle' | 'imageAlt'>
}

export const SITE_SEO_PAGES: SiteSeoPageDefinition[] = [
  { key: 'home', label: 'Homepage', route: '/', scale: 'single', vars: [], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'venues', label: 'Venues index', route: '/venues', scale: 'single', vars: [], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'events', label: 'Events index', route: '/events', scale: 'single', vars: [], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'counties', label: 'Counties index', route: '/counties', scale: 'single', vars: [], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'news', label: 'News index', route: '/news', scale: 'single', vars: [], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'map', label: 'Interactive map', route: '/map', scale: 'single', vars: [], supports: ['title', 'description', 'keywords'] },
  { key: 'pub-crawls', label: 'Pub crawls', route: '/pub-crawls', scale: 'single', vars: [], supports: ['title', 'description', 'keywords'] },
  { key: 'search', label: 'Search results', route: '/search?q=…', scale: 'single', vars: ['query'], supports: ['title', 'description', 'keywords'] },
  { key: 'town', label: 'Town hub page', route: '/town/{slug}', scale: 'thousands', vars: ['town', 'county', 'venueCount'], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'county', label: 'County hub page', route: '/county/{slug}', scale: 'hundreds', vars: ['county', 'venueCount', 'townCount'], supports: ['title', 'description', 'keywords', 'intro'] },
  { key: 'venue', label: 'Pub / venue page', route: '/venues/{id}/{slug}', scale: 'tens_of_thousands', vars: ['venue', 'town', 'county', 'postcode', 'venueType'], supports: ['title', 'description', 'keywords', 'linkTitle', 'imageAlt'] },
  { key: 'event', label: 'Event page', route: '/events/{id}', scale: 'thousands', vars: ['event', 'venue', 'town', 'date'], supports: ['title', 'description', 'keywords'] },
  { key: 'news-article', label: 'News article', route: '/news/{slug}', scale: 'hundreds', vars: ['title', 'excerpt'], supports: ['title', 'description', 'keywords', 'linkTitle', 'imageAlt'] },
  { key: 'stadium', label: 'Pubs near stadium', route: '/pubs-near-stadiums/{slug}', scale: 'hundreds', vars: ['club', 'stadium', 'radiusMiles'], supports: ['title', 'description', 'keywords', 'intro'] },
]

export const SITE_SEO_PAGE_KEYS = SITE_SEO_PAGES.map((page) => page.key)

/** Hand-written copy currently used by the single (non-templated) pages. */
export const SITE_SEO_STATIC_DEFAULTS: Partial<Record<SiteSeoPageKey, { title: string; description: string; keywords?: string; intro?: string }>> = {
  home: {
    title: 'UK Pubs & Sports Bars Directory — Find Venues Near You',
    description:
      'Discover pubs and sports bars across the UK. Browse venues in London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Brighton, Glasgow, Edinburgh, Newcastle, Sheffield, Nottingham and Cardiff. Find sports bars with big screens, live events, coastal pubs, and venues near Premier League grounds.',
    keywords: 'UK pubs, sports bars UK, pubs near me, UK pub directory, sports pubs, football pubs UK, pub crawl planner',
    intro: 'Discover events, browse by town or county, and find pubs near you — including sports pubs, coastal towns and Premier League grounds.',
  },
  venues: {
    title: 'Pubs and Venues in the UK',
    description: 'Browse pubs, bars and venues across the UK. Filter by town or county and find events, photos and details for every listing.',
    keywords: 'UK pubs, pubs, bars, venues, pub directory',
  },
  events: {
    title: 'Events in Pubs and Venues around the UK',
    description: 'Upcoming events at pubs and venues across the UK: live music, comedy, quizzes, sport on the big screen and more.',
    keywords: 'pub events, events UK, live music pubs, pub quiz, comedy nights, venues',
  },
  counties: {
    title: 'Browse pubs and events by county',
    description: 'County hub pages for pubs, venues and events across the UK. Pick a county to browse towns and listings.',
  },
  news: {
    title: 'UK Pub and Bar News — Openings, Closures and Industry Updates',
    description:
      'Read the latest UK pub and bar news: openings, closures, festivals, World Cup trading and hospitality stories from across England, Scotland and Wales.',
    keywords: 'UK pub news, bar news UK, pub openings, pub closures, Wetherspoon news, CAMRA, British pubs, hospitality news',
    intro: 'Latest openings, closures, festivals and industry stories from pubs and bars across England, Scotland and Wales.',
  },
  map: {
    title: 'Map of UK pubs and venues',
    description: 'Explore pubs and venues on an interactive map. Find events and listings near you.',
  },
  'pub-crawls': {
    title: 'Pub Crawls',
    description: 'Manage your pub crawl lists, invites, and shared crawls.',
  },
}

export function isSiteSeoPageKey(value: unknown): value is SiteSeoPageKey {
  return typeof value === 'string' && (SITE_SEO_PAGE_KEYS as string[]).includes(value)
}

export function siteSeoPageDefinition(key: string): SiteSeoPageDefinition | undefined {
  return SITE_SEO_PAGES.find((page) => page.key === key)
}

export type SiteSeoPageConfigFields = {
  titleTemplate?: string | null
  descriptionTemplate?: string | null
  keywords?: string | null
  introText?: string | null
  linkTitleTemplate?: string | null
  imageAltTemplate?: string | null
}

export type SiteSeoSettings = {
  includeKeywords: string[]
  excludeKeywords: string[]
  titleSuffix: string | null
}

export type SiteSeoConfig = {
  pages: Partial<Record<SiteSeoPageKey, SiteSeoPageConfigFields>>
  settings: SiteSeoSettings
}

export const EMPTY_SITE_SEO_SETTINGS: SiteSeoSettings = {
  includeKeywords: [],
  excludeKeywords: [],
  titleSuffix: null,
}

export const EMPTY_SITE_SEO_CONFIG: SiteSeoConfig = {
  pages: {},
  settings: EMPTY_SITE_SEO_SETTINGS,
}

export const SITE_SEO_PAGE_CONFIG_FIELDS: Array<keyof SiteSeoPageConfigFields> = [
  'titleTemplate',
  'descriptionTemplate',
  'keywords',
  'introText',
  'linkTitleTemplate',
  'imageAltTemplate',
]

export const SITE_SEO_FIELD_LABELS: Record<keyof SiteSeoPageConfigFields, string> = {
  titleTemplate: 'Page title',
  descriptionTemplate: 'Meta description',
  keywords: 'Keywords',
  introText: 'Intro copy',
  linkTitleTemplate: 'Link title',
  imageAltTemplate: 'Image alt text',
}

/**
 * Fill `{placeholder}` tokens. Unknown or empty tokens are removed and the
 * punctuation they leave behind is tidied so "Pubs in {town}, {county}" still
 * reads well when county is missing.
 */
export function renderSeoTemplate(template: string, vars: Record<string, unknown> = {}): string {
  let out = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? '' : String(value).trim()
  })
  const separator = (char: string) => (char === ',' || char === ':' ? `${char} ` : char === '|' ? ' | ' : ` ${char} `)
  out = out
    .replace(/\(\s*\)/g, '')
    // "Brighton, {county} — events" with an empty county keeps the last separator: "Brighton — events"
    .replace(/(?:\s*[,:|–—-]\s*){2,}/g, (match) => separator(match.trim().slice(-1)))
    .replace(/\b(in|near|at|for|of|across|around)\s*[,:|–—-]\s*/gi, '$1 ')
    // "{venue}, a {venueType} in {town}" with an empty type: "The Crown in Brighton"
    .replace(/,?\s*\b(a|an|the)\s+(in|at|near|on|for)\b/gi, ' $2')
    .replace(/^\s*[,:|–—-]\s*/, '')
    .replace(/\s*[,:|–—-]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
  return out
}

export function splitKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  return String(value ?? '')
    .split(/[,;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Apply the global keyword strategy: drop excluded phrases, append included ones. */
export function applyKeywordStrategy(keywords: string, settings: SiteSeoSettings): string {
  const exclude = new Set(settings.excludeKeywords.map((item) => item.toLowerCase()))
  const seen = new Set<string>()
  const result: string[] = []
  for (const keyword of [...splitKeywords(keywords), ...settings.includeKeywords]) {
    const lower = keyword.toLowerCase()
    if (exclude.has(lower) || seen.has(lower)) continue
    seen.add(lower)
    result.push(keyword)
  }
  return result.join(', ')
}

export function normaliseSiteSeoSettings(raw: Partial<Record<string, unknown>> | null | undefined): SiteSeoSettings {
  return {
    includeKeywords: splitKeywords(raw?.includeKeywords),
    excludeKeywords: splitKeywords(raw?.excludeKeywords),
    titleSuffix: raw?.titleSuffix ? String(raw.titleSuffix).trim() || null : null,
  }
}
