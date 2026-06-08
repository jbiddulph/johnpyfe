import type { BillingPlanId } from '../../utils/billing-plans'
import {
  getBillingPlan,
  getStripePriceId,
  nextBillingAnchorUnix,
} from '../../utils/billing-plans'
import {
  getMembershipForUser,
  getOrCreateOrganisationForUser,
} from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'
import { billingSiteUrl } from '../../utils/billing-site-url'
import { getStripe } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const planId = String(body?.plan || '').trim() as BillingPlanId
  const plan = getBillingPlan(planId)
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid subscription plan' })
  }

  let membership = await getMembershipForUser(user.id)
  if (!membership) {
    const displayName = String(user.user_metadata?.name || user.email?.split('@')[0] || 'My pubs')
    await getOrCreateOrganisationForUser(user.id, displayName)
    membership = await getMembershipForUser(user.id)
  }
  if (!membership) {
    throw createError({ statusCode: 500, statusMessage: 'Could not set up your account for billing' })
  }

  const siteUrl = billingSiteUrl(event)
  const stripe = getStripe()
  const organisation = membership.organisation
  const priceId = getStripePriceId(planId)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: organisation.stripeCustomerId ?? undefined,
      client_reference_id: organisation.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${siteUrl}/dashboard/billing?checkout=canceled`,
      metadata: {
        organisationId: organisation.id,
        plan: planId,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          organisationId: organisation.id,
          plan: planId,
        },
        billing_cycle_anchor: nextBillingAnchorUnix(),
        proration_behavior: 'create_prorations',
      },
    })

    return { url: session.url }
  } catch (error: unknown) {
    console.error('[api/billing/checkout] Stripe error:', error)
    const stripeMessage = error && typeof error === 'object' && 'message' in error
      ? String((error as { message: string }).message)
      : 'Stripe checkout failed'

    if (/no such price/i.test(stripeMessage)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Stripe price ID does not match your API keys. Use test price IDs with test keys, or live price IDs with live keys.',
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: stripeMessage,
    })
  }
})
