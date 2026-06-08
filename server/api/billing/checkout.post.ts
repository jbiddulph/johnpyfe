import type { BillingPlanId } from '../../utils/billing-plans'
import {
  getBillingPlan,
  getStripePriceId,
  nextBillingAnchorUnix,
} from '../../utils/billing-plans'
import { getMembershipForUser } from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'
import { getStripe } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const planId = String(body?.plan || '').trim() as BillingPlanId
  const plan = getBillingPlan(planId)
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid subscription plan' })
  }

  const membership = await getMembershipForUser(user.id)
  if (!membership) {
    throw createError({ statusCode: 400, statusMessage: 'Claim a pub before subscribing' })
  }

  const config = useRuntimeConfig()
  const siteUrl = String(config.public.appURL || config.public.baseURL || '').replace(/\/$/, '')
  if (!siteUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Site URL is not configured' })
  }

  const stripe = getStripe()
  const organisation = membership.organisation
  const priceId = getStripePriceId(planId)

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
})
