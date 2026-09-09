import type { Config } from '@netlify/functions'
import { runSiteSeoAudit } from '../../server/utils/ai/site-seo-audit'

export default async (req: Request) => {
  const expectedSecret = process.env.AI_SEO_CRON_SECRET
  if (!expectedSecret || req.headers.get('x-ai-seo-cron-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const auditId = String(body?.auditId || '').trim()
  if (!auditId) return new Response('auditId is required', { status: 400 })

  const result = await runSiteSeoAudit(auditId)
  console.log('[site-seo-audit-background] finished', {
    id: result.id,
    status: result.status,
    score: result.score,
    proposalCount: result.proposalCount,
  })
}

export const config: Config = {
  background: true,
  path: '/api/ai/site-seo-audit-background',
}
