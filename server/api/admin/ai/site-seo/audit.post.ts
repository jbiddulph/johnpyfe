import { requireAdmin } from '../../../../utils/require-admin'
import { billingSiteUrl } from '../../../../utils/billing-site-url'
import { createSiteSeoAudit, getRunningSiteSeoAudit, runSiteSeoAudit } from '../../../../utils/ai/site-seo-audit'
import { isMissingSiteSeoTableError } from '../../../../utils/ai/site-seo-config'

/**
 * Start a site-wide SEO audit. On Netlify the work is handed to the background
 * function so it can outlive the synchronous request limit; elsewhere it runs
 * in-process and the admin page polls for the result.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  const focus = String(body?.focus ?? '').trim().slice(0, 2000) || null

  try {
    const running = await getRunningSiteSeoAudit()
    if (running) return { started: false, alreadyRunning: true, audit: running }

    const audit = await createSiteSeoAudit(focus)
    const secret = process.env.AI_SEO_CRON_SECRET

    if (process.env.NETLIFY && secret) {
      const response = await fetch(new URL('/api/ai/site-seo-audit-background', billingSiteUrl(event)), {
        method: 'POST',
        headers: { 'x-ai-seo-cron-secret': secret, 'content-type': 'application/json' },
        body: JSON.stringify({ auditId: audit.id }),
      })
      if (!response.ok && response.status !== 202) {
        throw createError({ statusCode: 502, statusMessage: `Failed to start site SEO audit worker: ${response.status}` })
      }
      return { started: true, background: true, audit }
    }

    void runSiteSeoAudit(audit.id)
    return { started: true, background: false, audit }
  } catch (error) {
    if (!isMissingSiteSeoTableError(error)) throw error
    throw createError({ statusCode: 503, statusMessage: 'Site SEO database migration has not been applied yet' })
  }
})
