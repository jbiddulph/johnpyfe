import { requireAdmin } from '../../../../utils/require-admin'
import { createSiteSeoAudit, getRunningSiteSeoAudit, runSiteSeoAudit } from '../../../../utils/ai/site-seo-audit'
import { isMissingSiteSeoTableError } from '../../../../utils/ai/site-seo-config'

/**
 * Start a site-wide SEO audit in-process. The admin page polls for the result.
 * (Netlify background SEO functions have been removed.)
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  const focus = String(body?.focus ?? '').trim().slice(0, 2000) || null

  try {
    const running = await getRunningSiteSeoAudit()
    if (running) return { started: false, alreadyRunning: true, audit: running }

    const audit = await createSiteSeoAudit(focus)
    void runSiteSeoAudit(audit.id)
    return { started: true, background: false, audit }
  } catch (error) {
    if (!isMissingSiteSeoTableError(error)) throw error
    throw createError({ statusCode: 503, statusMessage: 'Site SEO database migration has not been applied yet' })
  }
})
