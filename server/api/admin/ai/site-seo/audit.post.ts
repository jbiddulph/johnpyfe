import { requireAdmin } from '../../../../utils/require-admin'
import { billingSiteUrl } from '../../../../utils/billing-site-url'
import { createSiteSeoAudit, getRunningSiteSeoAudit, runSiteSeoAudit } from '../../../../utils/ai/site-seo-audit'
import { isMissingSiteSeoTableError } from '../../../../utils/ai/site-seo-config'

/**
 * Kick off a site-wide SEO audit and return immediately.
 *
 * Important: never `await` the background worker here. Waiting on a same-site
 * fetch from a Netlify function often hangs until the gateway times out, which
 * the browser surfaces as `Failed to fetch` with no response.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  const focus = String(body?.focus ?? '').trim().slice(0, 2000) || null

  try {
    const running = await getRunningSiteSeoAudit()
    if (running) {
      return { started: false, alreadyRunning: true, audit: running }
    }

    const audit = await createSiteSeoAudit(focus)
    const secret = process.env.AI_SEO_CRON_SECRET
    const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_DEV)

    if (onNetlify && secret) {
      dispatchSiteSeoAuditBackground(billingSiteUrl(event), secret, audit.id)
      return { started: true, background: true, audit }
    }

    // Local / non-Netlify: run in-process without blocking the HTTP response.
    void runSiteSeoAudit(audit.id).catch((error) => {
      console.error('[site-seo/audit] in-process run failed', audit.id, (error as Error).message)
    })
    return { started: true, background: false, audit }
  } catch (error) {
    if (!isMissingSiteSeoTableError(error)) throw error
    throw createError({
      statusCode: 503,
      statusMessage: 'Site SEO database migration has not been applied yet',
    })
  }
})

/** Fire-and-forget: prefer the Netlify background function, fall back to Nitro worker route. */
function dispatchSiteSeoAuditBackground(siteUrl: string, secret: string, auditId: string) {
  const payload = JSON.stringify({ auditId })
  const headers = {
    'x-ai-seo-cron-secret': secret,
    'content-type': 'application/json',
  }

  const targets = [
    // Custom path declared on the Netlify background function
    new URL('/api/ai/site-seo-audit-background', siteUrl),
    // Direct function URL (always available even if the custom path is shadowed by Nitro)
    new URL('/.netlify/functions/site-seo-audit-background', siteUrl),
  ]

  void (async () => {
    for (const url of targets) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: payload,
          signal: AbortSignal.timeout(8_000),
        })
        // Background functions respond 202; a sync fallback may respond 200.
        if (response.ok || response.status === 202) {
          console.log('[site-seo/audit] dispatched', url.pathname, response.status)
          return
        }
        console.warn('[site-seo/audit] dispatch non-OK', url.pathname, response.status)
      } catch (error) {
        console.warn('[site-seo/audit] dispatch failed', url.pathname, (error as Error).message)
      }
    }

    // Last resort: run in this isolate (may be cut short by the sync limit).
    console.warn('[site-seo/audit] falling back to in-process run', auditId)
    try {
      await runSiteSeoAudit(auditId)
    } catch (error) {
      console.error('[site-seo/audit] fallback run failed', auditId, (error as Error).message)
    }
  })()
}
