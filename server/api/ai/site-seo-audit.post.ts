import { runSiteSeoAudit } from '../../utils/ai/site-seo-audit'

/** Worker entry point (secret-protected) used when no Netlify background function is available. */
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
  if (!auditId) throw createError({ statusCode: 400, statusMessage: 'auditId is required' })
  return runSiteSeoAudit(auditId)
})
