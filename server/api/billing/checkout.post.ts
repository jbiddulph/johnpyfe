import type { BillingPlanId } from '../../utils/billing-plans'
import {
  getBillingPlan,
  getStripePriceId,
  isSubscriptionActive,
  nextBillingAnchorUnix,
} from '../../utils/billing-plans'
import {
  getMembershipForUser,
  getOrCreateOrganisationForUser,
} from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'
import { billingSiteUrl } from '../../utils/billing-site-url'
import { prisma } from '../../utils/prisma'
import { getStripe } from '../../utils/stripe'
import { syncOrganisationFromSubscription } from '../../utils/sync-stripe-subscription'

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
  let organisation = membership.organisation
  const priceId = getStripePriceId(planId)

  if (!organisation.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: organisation.name,
      metadata: { organisationId: organisation.id, userId: user.id },
    })
    organisation = await prisma.organisation.update({
      where: { id: organisation.id },
      data: { stripeCustomerId: customer.id },
    })
  }

  // Existing active subscription → upgrade/downgrade in place (do not open a second Checkout)
  if (
    organisation.stripeSubscriptionId
    && isSubscriptionActive(organisation.subscriptionStatus)
  ) {
    try {
      const subscription = await stripe.subscriptions.retrieve(organisation.stripeSubscriptionId)
      if (!isSubscriptionActive(subscription.status)) {
        // Fall through to new Checkout below
      } else {
        const itemId = subscription.items.data[0]?.id
        if (!itemId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Current subscription has no price item to update',
          })
        }

        const updated = await stripe.subscriptions.update(organisation.stripeSubscriptionId, {
          items: [{ id: itemId, price: priceId }],
          metadata: {
            organisationId: organisation.id,
            plan: planId,
            userId: user.id,
          },
          proration_behavior: 'create_prorations',
        })

        await syncOrganisationFromSubscription(organisation.id, updated)

        return {
          url: null,
          upgraded: true,
          plan: planId,
          message: `Updated to ${plan.label}. You can now claim up to ${plan.pubLimit} pubs.`,
        }
      }
    } catch (error: unknown) {
      // Re-throw intentional API errors
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error
      }

      // If subscription was deleted in Stripe, fall through to Checkout
      const stripeMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : ''
      const missing = /no such subscription/i.test(stripeMessage)
      if (!missing) {
        console.error('[api/billing/checkout] Upgrade error:', error)
        throw createError({
          statusCode: 400,
          statusMessage: stripeMessage || 'Could not update your subscription',
        })
      }

      await prisma.organisation.update({
        where: { id: organisation.id },
        data: { stripeSubscriptionId: null },
      })
      organisation = { ...organisation, stripeSubscriptionId: null }
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: organisation.stripeCustomerId!,
      client_reference_id: organisation.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
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

    return { url: session.url, upgraded: false }
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

    if (/does not allow requests from your ip/i.test(stripeMessage)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Stripe API key IP restriction blocked checkout. On Netlify use a standard secret key (sk_test_ or sk_live_) or a restricted key (rk_) without IP allowlisting — serverless functions use AWS IPs, not your browser IP.',
      })
    }

    // Retry once without billing_cycle_anchor — some Stripe configs reject it on Checkout
    if (/billing.?cycle.?anchor/i.test(stripeMessage)) {
      try {
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: organisation.stripeCustomerId!,
          client_reference_id: organisation.id,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${siteUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
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
          },
        })
        return { url: session.url, upgraded: false }
      } catch (retryError: unknown) {
        console.error('[api/billing/checkout] Stripe retry error:', retryError)
        const retryMessage = retryError && typeof retryError === 'object' && 'message' in retryError
          ? String((retryError as { message: string }).message)
          : stripeMessage
        throw createError({ statusCode: 400, statusMessage: retryMessage })
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: stripeMessage,
    })
  }
})
