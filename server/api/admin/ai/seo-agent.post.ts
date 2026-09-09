import { requireAdmin } from '../../../utils/require-admin'
import { billingSiteUrl } from '../../../utils/billing-site-url'
import { getLiveSeoRun, parseSeoAgentLimit, stopSeoRuns } from '../../../utils/ai/seo-agent'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const secret = process.env.AI_SEO_CRON_SECRET
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'AI_SEO_CRON_SECRET is not configured' })
  }

  const body = await readBody(event).catch(() => ({}))
  if (String(body?.action || '') === 'stop') {
    return stopSeoRuns('Stopped by admin')
  }

  const live = await getLiveSeoRun()
  if (live) {
    return {
      started: false,
      alreadyRunning: true,
      run: live,
    }
  }

  const limit = parseSeoAgentLimit(body?.limit || process.env.AI_SEO_DAILY_LIMIT)

  const response = await fetch(new URL('/api/ai/daily-seo-background', billingSiteUrl(event)), {
    method: 'POST',
    headers: {
      'x-ai-seo-cron-secret': secret,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ limit }),
  })

  if (!response.ok && response.status !== 202) {
    throw createError({
      statusCode: 502,
      statusMessage: `Failed to start SEO background worker: ${response.status}`,
    })
  }

  return {
    started: true,
    limit,
  }
})
