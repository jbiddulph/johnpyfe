import { requireAdmin } from '../../../../../utils/require-admin'
import { bulkReviewSiteSeoProposals } from '../../../../../utils/ai/site-seo-audit'

/** Approve or reject a whole chunk of pending proposals (by ids or by audit). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  const action = String(body?.action || '').trim()
  if (action !== 'approve' && action !== 'reject') {
    throw createError({ statusCode: 400, statusMessage: 'action must be approve or reject' })
  }

  const ids = Array.isArray(body?.ids) ? body.ids.map((id: unknown) => String(id)).filter(Boolean) : []
  const auditId = String(body?.auditId || '').trim() || undefined
  if (!ids.length && !auditId) {
    throw createError({ statusCode: 400, statusMessage: 'Provide ids or auditId' })
  }

  return bulkReviewSiteSeoProposals(action, { ids, auditId })
})
