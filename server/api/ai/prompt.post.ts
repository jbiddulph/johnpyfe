import { getRequestIP } from 'h3'
import {
  AI_PROMPT_HISTORY_LIMIT,
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_MIN_LENGTH,
  type AiPromptHistoryItem,
} from '../../../types/ai-prompt'
import { answerAiPrompt } from '../../utils/ai/prompt-agent'

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 10 * 60 * 1000

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function clientKey(event: Parameters<typeof getRequestIP>[0]) {
  return getRequestIP(event, { xForwardedFor: true }) || 'anonymous'
}

function rateLimit(key: string) {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + RATE_WINDOW_MS }
    buckets.set(key, next)
    return { ok: true, remaining: RATE_LIMIT - 1, resetAt: next.resetAt }
  }
  if (existing.count >= RATE_LIMIT) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt }
  }
  existing.count += 1
  return { ok: true, remaining: RATE_LIMIT - existing.count, resetAt: existing.resetAt }
}

function parseHistory(raw: unknown): AiPromptHistoryItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(-AI_PROMPT_HISTORY_LIMIT)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const role = (item as AiPromptHistoryItem).role
      const content = String((item as AiPromptHistoryItem).content || '').trim()
      if ((role !== 'user' && role !== 'assistant') || !content) return null
      return { role, content: content.slice(0, AI_PROMPT_MAX_LENGTH) }
    })
    .filter((item): item is AiPromptHistoryItem => item != null)
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const limited = rateLimit(clientKey(event))
  setResponseHeader(event, 'X-RateLimit-Limit', String(RATE_LIMIT))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(limited.remaining))
  if (!limited.ok) {
    const retryAfter = Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000))
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many questions just now. Please wait a minute and try again.',
    })
  }

  const body = await readBody(event).catch(() => null)
  const prompt = String(body?.prompt ?? body?.q ?? '').trim()
  if (prompt.length < AI_PROMPT_MIN_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Ask a question of at least ${AI_PROMPT_MIN_LENGTH} characters.`,
    })
  }
  if (prompt.length > AI_PROMPT_MAX_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Keep questions under ${AI_PROMPT_MAX_LENGTH} characters.`,
    })
  }

  try {
    return await answerAiPrompt({
      prompt,
      history: parseHistory(body?.history),
    })
  } catch (error) {
    console.error('[api/ai/prompt] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not answer just now. Please try again.',
    })
  }
})
