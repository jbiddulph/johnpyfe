export type GscSeoContext = {
  pageUrl: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  expectedCtr: number
  ctrGap: number
  opportunityScore: number
  reason: string
  topQueries: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
}

/** Where the live title / meta / keywords value came from for this venue. */
export type SeoFieldSource = 'profile' | 'site_template' | 'code_default'

export type PubSeoData = {
  venueId: number
  name: string
  venueType: string
  address: string
  town: string
  county: string
  postcode: string
  location: string
  description: string | null
  facilities: string[]
  openingHours: string | null
  images: string[]
  /** Effective live values (profile override, else site template, else code default). */
  pageTitle: string | null
  metaDescription: string | null
  seoKeywords: string[]
  /** Source of each effective SEO field — used so the agent does not “fix” templated copy. */
  seoSources: {
    pageTitle: SeoFieldSource
    metaDescription: SeoFieldSource
    seoKeywords: SeoFieldSource
  }
  /**
   * True when the venue profile already stores a custom page title or meta description.
   * In that case site-wide venue templates are disabled on the listing page.
   */
  hasCustomListingSeo: boolean
  website: string | null
  nearbyAreas: string[]
  nearbyLandmarks: string[]
  isClaimed: boolean
  /** Present when the daily run selected this venue from Google Search Console. */
  gsc?: GscSeoContext | null
}

export type SeoChanges = {
  pageTitle?: string | null
  metaDescription?: string | null
  description?: string | null
  seoKeywords?: string[] | null
  faqSuggestions?: Array<{ question: string; answer: string }>
  missingContentWarnings?: string[]
  topics?: string[]
  sourceNotes?: string[]
}

export type SeoAnalysis = {
  score: number
  issues: string[]
  opportunities: string[]
  changes: SeoChanges
}

export type SavedSeoChanges = {
  venueId: number
  status: 'applied' | 'pending'
  recommendationId: string
  improvementCount: number
}

export type SaveSeoChangesOptions = {
  runId?: string | null
}

export type SeoFieldSnapshot = {
  pageTitle: string
  metaDescription: string
  description: string
  seoKeywords: string
}

export type SeoFieldDiff = {
  field: keyof SeoFieldSnapshot
  label: string
  before: string
  after: string
  changed: boolean
}
