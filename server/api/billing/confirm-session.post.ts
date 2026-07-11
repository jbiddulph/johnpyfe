import { getMembershipForUser } from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'
import { syncOrganisationFromCheckoutSession } from '../../utils/sync-stripe-billing'
import { getStripe } from '../../utils/stripe'

/** Confirm a completed Checkout session and sync subscription to the organisation (webhook fallback). */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const sessionId = String(body?.sessionId || '').trim()
  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId is required' })
  }

  const membership = await getMembershipForUser(user.id)
  if (!membership) {
    throw createError({ statusCode: 400, statusMessage: 'No organisation found' })
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  const organisationId = String(
    session.metadata?.organisationId || session.client_reference_id || '',
  ).trim()

  if (!organisationId || organisationId !== membership.organisation.id) {
    throw createError({ statusCode: 403, statusMessage: 'Checkout session does not belong to your account' })
  }

  if (session.status !== 'complete') {
    throw createError({ statusCode: 400, statusMessage: 'Checkout session is not complete yet' })
  }

  if (session.payment_status === 'unpaid') {
    throw createError({ statusCode: 400, statusMessage: 'Checkout payment is still unpaid' })
  }

  const result = await syncOrganisationFromCheckoutSession(organisationId, session, stripe)
  return result
})
