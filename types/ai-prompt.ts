export type AiPromptHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiPromptVenue = {
  id: number
  slug: string
  venuename: string
  town: string
  county: string
  address: string
  postcode: string
  href: string
  venuetype?: string
  featuresPreview?: string
}

export type AiPromptEvent = {
  id: number
  title: string
  startsAt: string
  venueName: string
  town: string
  category: string
  href: string
  venueHref: string
}

export type AiPromptPlace = {
  kind: 'town' | 'county'
  name: string
  href: string
  venueCount?: number
}

export type AiPromptNews = {
  title: string
  slug: string
  excerpt: string
  href: string
  publishedAt: string
}

export type AiPromptStadium = {
  club: string
  stadiumName: string
  href: string
  pubCount?: number
}

export type AiPromptResponse = {
  answer: string
  usedFallback: boolean
  toolsCalled: string[]
  venues: AiPromptVenue[]
  events: AiPromptEvent[]
  places: AiPromptPlace[]
  news: AiPromptNews[]
  stadiums: AiPromptStadium[]
  suggestedQueries: string[]
}

export const AI_PROMPT_MAX_LENGTH = 1200
export const AI_PROMPT_MIN_LENGTH = 2
export const AI_PROMPT_HISTORY_LIMIT = 6
