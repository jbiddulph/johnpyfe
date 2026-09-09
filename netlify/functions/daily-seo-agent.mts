import type { Config } from '@netlify/functions'
import { parseSeoAgentLimit } from '../../server/utils/ai/seo-agent'

export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL
  const secret = process.env.AI_SEO_CRON_SECRET
  if (!siteUrl || !secret) {
    throw new Error('URL and AI_SEO_CRON_SECRET must be configured for daily SEO scheduling')
  }

  const response = await fetch(new URL('/api/ai/daily-seo-background', siteUrl), {
    method: 'POST',
    headers: {
      'x-ai-seo-cron-secret': secret,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      limit: parseSeoAgentLimit(process.env.AI_SEO_DAILY_LIMIT),
    }),
  })

  if (!response.ok && response.status !== 202) {
    throw new Error(`Failed to start SEO background worker: ${response.status} ${await response.text()}`)
  }

  console.log('[daily-seo-agent] background worker started')
}

export const config: Config = {
  schedule: '0 2 * * *',
}
