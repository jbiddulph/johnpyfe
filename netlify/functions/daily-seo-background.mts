import type { Config } from '@netlify/functions'
import { runDailySeoAgent } from '../../server/utils/ai/seo-agent'

export default async (req: Request) => {
  const expectedSecret = process.env.AI_SEO_CRON_SECRET
  if (!expectedSecret || req.headers.get('x-ai-seo-cron-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = Number.parseInt(String(body?.limit || process.env.AI_SEO_DAILY_LIMIT || '500'), 10)
  const result = await runDailySeoAgent(Number.isFinite(limit) ? limit : 500)

  console.log('[daily-seo-background] finished', {
    id: result.id,
    status: result.status,
    processedCount: result.processedCount,
    appliedCount: result.appliedCount,
    draftedCount: result.draftedCount,
    errorCount: result.errorCount,
  })
}

export const config: Config = {
  background: true,
  path: '/api/ai/daily-seo-background',
}
