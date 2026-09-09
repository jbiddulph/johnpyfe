import type { Config } from '@netlify/functions'
import { parseSeoAgentLimit, runDailySeoAgent } from '../../server/utils/ai/seo-agent'

async function continueRun(runId: string, limit: number, secret: string) {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL
  if (!siteUrl) return
  await fetch(new URL('/api/ai/daily-seo-background', siteUrl), {
    method: 'POST',
    headers: {
      'x-ai-seo-cron-secret': secret,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ limit, runId }),
  }).catch((error) => {
    console.warn('[daily-seo-background] failed to continue run', runId, (error as Error).message)
  })
}

export default async (req: Request) => {
  const expectedSecret = process.env.AI_SEO_CRON_SECRET
  if (!expectedSecret || req.headers.get('x-ai-seo-cron-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = parseSeoAgentLimit(body?.limit || process.env.AI_SEO_DAILY_LIMIT)
  const result = await runDailySeoAgent(limit, { runId: body?.runId ? String(body.runId) : undefined })

  if (result.shouldContinue && result.status === 'running') {
    await continueRun(result.id, result.requestedLimit, expectedSecret)
  }

  console.log('[daily-seo-background] finished', {
    id: result.id,
    status: result.status,
    processedCount: result.processedCount,
    appliedCount: result.appliedCount,
    draftedCount: result.draftedCount,
    errorCount: result.errorCount,
    shouldContinue: result.shouldContinue,
  })
}

export const config: Config = {
  background: true,
  path: '/api/ai/daily-seo-background',
}
