export type PubAssistantLinkType =
  | 'venue'
  | 'town'
  | 'county'
  | 'event'
  | 'news'
  | 'stadium'
  | 'search'
  | 'map'

export type PubAssistantLink = {
  type: PubAssistantLinkType
  label: string
  href: string
}

export type PubAssistantHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export type PubAssistantReply = {
  answer: string
  links: PubAssistantLink[]
  toolsUsed: string[]
}

export type PubAssistantAskBody = {
  question?: string
  latitude?: number
  longitude?: number
  history?: PubAssistantHistoryItem[]
}
