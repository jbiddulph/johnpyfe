import { requireAdmin } from '../../../../../utils/require-admin'
import {
  approveSiteSeoProposal,
  rejectSiteSeoProposal,
  revertSiteSeoProposal,
} from '../../../../../utils/ai/site-seo-audit'

/** Approve (optionally with edited payload), reject or revert a single proposal. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Proposal id is required' })

  const body = await readBody(event).catch(() => ({}))
  const action = String(body?.action || '').trim()

  if (action === 'approve') {
    const edited = body?.after && typeof body.after === 'object' ? (body.after as Record<string, unknown>) : null
    return approveSiteSeoProposal(id, edited)
  }
  if (action === 'reject') return rejectSiteSeoProposal(id)
  if (action === 'revert') return revertSiteSeoProposal(id)

  throw createError({ statusCode: 400, statusMessage: 'action must be approve, reject or revert' })
})
