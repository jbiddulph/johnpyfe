import { askPubAssistant } from '../../utils/ai/pub-assistant'
import { assertRateLimit } from '../../utils/ai/rate-limit'
import type { PubAssistantAskBody } from '../../../types/pub-assistant'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'anonymous'
  assertRateLimit(`pub-assistant:${ip}`, 20, 10 * 60 * 1000)

  const raw = await readBody(event).catch(() => null)
  const body: PubAssistantAskBody = raw && typeof raw === 'object' ? raw : {}

  try {
    return await askPubAssistant({
      question: body.question,
      history: body.history,
      latitude: body.latitude,
      longitude: body.longitude,
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Ask UK Pubs failed'
    console.error('[api/ai/ask] failed:', message)
    throw createError({
      statusCode: message.includes('OPENAI_API_KEY') ? 503 : 502,
      statusMessage: 'Ask UK Pubs failed',
      message: message.includes('timed out')
        ? 'The assistant took too long. Please try a shorter question.'
        : 'The assistant is unavailable right now. Please try again shortly.',
    })
  }
})
