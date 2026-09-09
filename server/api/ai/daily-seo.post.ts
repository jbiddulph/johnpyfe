import { parseSeoAgentLimit, runDailySeoAgent } from '../../utils/ai/seo-agent'

export default defineEventHandler(async (event) => {
  const expectedSecret = process.env.AI_SEO_CRON_SECRET
  if (!expectedSecret) {
    throw createError({ statusCode: 503, statusMessage: 'AI_SEO_CRON_SECRET is not configured' })
  }

  const actualSecret = getHeader(event, 'x-ai-seo-cron-secret')
  if (actualSecret !== expectedSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid SEO cron secret' })
  }

  const body = await readBody(event).catch(() => ({}))
  return runDailySeoAgent(parseSeoAgentLimit(body?.limit || process.env.AI_SEO_DAILY_LIMIT))
})
