import type { H3Event } from 'h3'
import { answerAiPrompt } from '../../utils/ai/prompt-agent'
import {
  AI_PROMPT_HISTORY_LIMIT,
  AI_PROMPT_MAX_LENGTH,
  AI_PROMPT_MIN_LENGTH,
  type AiPromptHistoryMessage,
} from '../../../types/ai-prompt'

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 20
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(event: H3Event) {
  const netlifyIp = getHeader(event, 'x-nf-client-connection-ip')
  if (netlifyIp) return netlifyIp.trim()
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

function assertRateLimit(ip: string) {
  const now = Date.now()
  const current = rateBuckets.get(ip)
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return
  }
  if (current.count >= RATE_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many questions just now. Please wait a few minutes and try again.',
    })
  }
  current.count += 1
}

function sanitiseHistory(raw: unknown): AiPromptHistoryMessage[] {
  if (!Array.isArray(raw)) return []
  const messages: AiPromptHistoryMessage[] = []
  for (const item of raw.slice(-AI_PROMPT_HISTORY_LIMIT)) {
    if (!item || typeof item !== 'object') continue
    const role = (item as { role?: unknown }).role
    const content = String((item as { content?: unknown }).content || '').trim()
    if ((role !== 'user' && role !== 'assistant') || !content) continue
    messages.push({ role, content: content.slice(0, 800) })
  }
  return messages
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const ip = clientIp(event)
  assertRateLimit(ip)

  const body = await readBody(event).catch(() => null)
  const prompt = String(body?.prompt ?? body?.q ?? '').trim()
  if (prompt.length < AI_PROMPT_MIN_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please enter a question.',
    })
  }
  if (prompt.length > AI_PROMPT_MAX_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Questions can be up to ${AI_PROMPT_MAX_LENGTH} characters.`,
    })
  }

  try {
    return await answerAiPrompt({
      prompt,
      history: sanitiseHistory(body?.history),
    })
  } catch (error) {
    console.error('[api/ai/prompt] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'The assistant could not answer just now. Please try again.',
    })
  }
})
