import type { Config } from '@netlify/functions'
import { getLiveSeoRun, nextSeoRunLimit, isSeoCronEnabled } from '../../server/utils/ai/seo-agent'

/**
 * Formerly scheduled at 00:00–04:00 UTC. Cron is OFF unless AI_SEO_CRON_ENABLED=true.
 * Manual “Run now” from the admin SEO Agent page still works via /api/ai/daily-seo-background.
 */
export default async () => {
  if (!isSeoCronEnabled()) {
    console.log('[daily-seo-agent] cron disabled (set AI_SEO_CRON_ENABLED=true to re-enable)')
    return
  }

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL
  const secret = process.env.AI_SEO_CRON_SECRET
  if (!siteUrl || !secret) {
    throw new Error('URL and AI_SEO_CRON_SECRET must be configured for daily SEO scheduling')
  }

  const live = await getLiveSeoRun()
  if (live) {
    console.log('[daily-seo-agent] skipped, run already in progress', live.id)
    return
  }

  const limit = await nextSeoRunLimit()
  if (limit <= 0) {
    console.log('[daily-seo-agent] skipped, daily cap already reached')
    return
  }

  const response = await fetch(new URL('/api/ai/daily-seo-background', siteUrl), {
    method: 'POST',
    headers: {
      'x-ai-seo-cron-secret': secret,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ limit }),
  })

  if (!response.ok && response.status !== 202) {
    throw new Error(`Failed to start SEO background worker: ${response.status} ${await response.text()}`)
  }

  console.log('[daily-seo-agent] background worker started', { limit })
}

// No Netlify `schedule` — cron must stay off until explicitly re-enabled.
export const config: Config = {}
