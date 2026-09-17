export const AI_PROMPT_MIN_LENGTH = 3
export const AI_PROMPT_MAX_LENGTH = 500
export const AI_PROMPT_HISTORY_LIMIT = 6

export const AI_PROMPT_EXAMPLES = [
  'Dog-friendly pubs in Brighton',
  'What’s on in Manchester this week?',
  'Pubs near Anfield',
  'Live sport in Leeds',
] as const

export type AiPromptLinkKind =
  | 'venue'
  | 'town'
  | 'county'
  | 'event'
  | 'news'
  | 'stadium'
  | 'page'

export type AiPromptLink = {
  title: string
  href: string
  kind: AiPromptLinkKind
  meta?: string
}

export type AiPromptHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export type AiPromptResponse = {
  prompt: string
  answer: string
  links: AiPromptLink[]
  usedTools: string[]
  fallback: boolean
}
