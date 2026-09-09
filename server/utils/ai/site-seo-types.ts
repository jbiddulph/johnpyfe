import type { SiteSeoPageConfigFields, SiteSeoPageKey, SiteSeoSettings } from '../../../utils/site-seo-pages'

export const SITE_SEO_PROPOSAL_KINDS = [
  'page_meta',
  'content',
  'link_titles',
  'image_alt',
  'keyword_strategy',
  'news_refresh',
  'manual',
] as const
export type SiteSeoProposalKind = (typeof SITE_SEO_PROPOSAL_KINDS)[number]

export const SITE_SEO_PROPOSAL_KIND_LABELS: Record<SiteSeoProposalKind, string> = {
  page_meta: 'Titles & descriptions',
  content: 'Fresh content',
  link_titles: 'Link titles',
  image_alt: 'Image alt text',
  keyword_strategy: 'Keyword strategy',
  news_refresh: 'News refresh',
  manual: 'Technical (manual)',
}

export type SiteSeoImpact = 'high' | 'medium' | 'low'
export type SiteSeoEffort = 'low' | 'medium' | 'high'

/** What an approved proposal writes. Shape depends on `kind`. */
export type SiteSeoPageMetaPayload = Pick<SiteSeoPageConfigFields, 'titleTemplate' | 'descriptionTemplate' | 'keywords'>
export type SiteSeoContentPayload = Pick<SiteSeoPageConfigFields, 'introText'>
export type SiteSeoLinkTitlesPayload = Pick<SiteSeoPageConfigFields, 'linkTitleTemplate'>
export type SiteSeoImageAltPayload = Pick<SiteSeoPageConfigFields, 'imageAltTemplate'>
export type SiteSeoKeywordStrategyPayload = Partial<SiteSeoSettings>
export type SiteSeoNewsRefreshPayload = { title?: string | null; excerpt?: string | null; content?: string | null }
export type SiteSeoManualPayload = { steps?: string[]; notes?: string | null }

export type SiteSeoProposalPayload =
  | SiteSeoPageMetaPayload
  | SiteSeoContentPayload
  | SiteSeoLinkTitlesPayload
  | SiteSeoImageAltPayload
  | SiteSeoKeywordStrategyPayload
  | SiteSeoNewsRefreshPayload
  | SiteSeoManualPayload

export type SiteSeoProposalDraft = {
  kind: SiteSeoProposalKind
  /** Page key, `global` for keyword strategy, or a news slug for news_refresh. */
  target: SiteSeoPageKey | 'global' | string
  title: string
  rationale: string
  impact: SiteSeoImpact
  effort: SiteSeoEffort
  after: Record<string, unknown>
}

export type SiteSeoFinding = {
  area: string
  severity: 'high' | 'medium' | 'low' | 'info'
  detail: string
}

export type SiteSeoAuditResult = {
  score: number
  summary: string
  findings: SiteSeoFinding[]
  proposals: SiteSeoProposalDraft[]
}

export type SiteSeoInventory = {
  generatedAt: string
  site: { url: string; brand: string; titleSuffix: string }
  counts: {
    liveVenues: number
    towns: number
    counties: number
    upcomingEvents: number
    newsArticles: number
    stadiumPages: number
  }
  quality: {
    venuesWithoutPhoto: number
    venuesThinDescription: number
    venuesWithoutFeatures: number
    venuesWithoutWebsite: number
    venueProfilesWithCustomSeo: number
    listingRecommendationsPending: number
    listingRecommendationsApplied: number
    newsWithoutImage: number
    daysSinceLastNews: number | null
  }
  pages: Array<{
    key: SiteSeoPageKey
    label: string
    route: string
    scale: string
    vars: string[]
    supports: string[]
    current: SiteSeoPageConfigFields
    /** Examples of what real URLs of this type render today (with current overrides applied). */
    examples: Array<{ url: string; title: string; description: string; keywords: string; vars: Record<string, unknown> }>
  }>
  settings: SiteSeoSettings
  news: Array<{ slug: string; title: string; excerpt: string; publishedAt: string; hasImage: boolean }>
  technical: {
    canonicalTags: boolean
    robotsDisallow: string[]
    sitemapChunks: boolean
    isrRoutes: string[]
    structuredData: string[]
    openGraph: boolean
    imageAltStrategy: string
  }
}
