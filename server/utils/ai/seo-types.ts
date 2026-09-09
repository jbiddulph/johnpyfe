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
  pageTitle: string | null
  metaDescription: string | null
  seoKeywords: string[]
  website: string | null
  nearbyAreas: string[]
  nearbyLandmarks: string[]
  isClaimed: boolean
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
