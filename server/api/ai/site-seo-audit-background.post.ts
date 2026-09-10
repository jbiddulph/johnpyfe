import { runSiteSeoAudit } from '../../utils/ai/site-seo-audit'

/**
 * Sync fallback worker for site SEO audits.
 * Used when the Netlify background function path is unavailable (local/dev),
 * or as a same-origin target the admin starter can hit without blocking.
 *
 * Always acknowledge quickly — never make the caller wait for the full audit.
 */
export default defineEventHandler(async (event) => {
  const expectedSecret = process.env.AI_SEO_CRON_SECRET
  if (!expectedSecret) {
    throw createError({ statusCode: 503, statusMessage: 'AI_SEO_CRON_SECRET is not configured' })
  }
  if (getHeader(event, 'x-ai-seo-cron-secret') !== expectedSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid SEO cron secret' })
  }

  const body = await readBody(event).catch(() => ({}))
  const auditId = String(body?.auditId || '').trim()
  if (!auditId) {
    throw createError({ statusCode: 400, statusMessage: 'auditId is required' })
  }

  void runSiteSeoAudit(auditId).catch((error) => {
    console.error('[api/ai/site-seo-audit-background] failed', auditId, (error as Error).message)
  })

  setResponseStatus(event, 202)
  return { accepted: true, auditId }
})
