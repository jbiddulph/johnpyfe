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

function stripeErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return ''
}

function stripeErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code: unknown }).code || '')
}

/** True for our createError() throws — not Stripe SDK errors (which also have statusCode). */
function isAppHttpError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  // Stripe errors include `raw` / `type` like StripeInvalidRequestError
  if ('raw' in error || ('type' in error && String((error as { type: unknown }).type).includes('Stripe'))) {
    return false
  }
  return 'statusMessage' in error && typeof (error as { statusMessage: unknown }).statusMessage === 'string'
}

function isMissingStripeResource(error: unknown): boolean {
  const message = stripeErrorMessage(error)
  const code = stripeErrorCode(error)
  return (
    code === 'resource_missing'
    || /no such (subscription|customer|price)/i.test(message)
    || /^not found$/i.test(message.trim())
  )
}

async function ensureStripeCustomer(
  organisation: { id: string; name: string; stripeCustomerId: string | null },
  user: { id: string; email?: string | null },
) {
  const stripe = getStripe()
  if (organisation.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(organisation.stripeCustomerId)
      return organisation.stripeCustomerId
    } catch (error: unknown) {
      if (!isMissingStripeResource(error)) throw error
      // Stale customer id (test/live mismatch or deleted) — recreate below
    }
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: organisation.name,
    metadata: { organisationId: organisation.id, userId: user.id },
  })

  await prisma.organisation.update({
    where: { id: organisation.id },
    data: { stripeCustomerId: customer.id },
  })
  return customer.id
}

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

  let customerId: string
  try {
    customerId = await ensureStripeCustomer(organisation, user)
    organisation = { ...organisation, stripeCustomerId: customerId }
  } catch (error: unknown) {
    console.error('[api/billing/checkout] Customer setup error:', error)
    throw createError({
      statusCode: 400,
      statusMessage: stripeErrorMessage(error) || 'Could not create Stripe customer',
    })
  }

  // Existing active subscription → upgrade/downgrade in place (do not open a second Checkout)
  if (
    organisation.stripeSubscriptionId
    && isSubscriptionActive(organisation.subscriptionStatus)
  ) {
    try {
      const subscription = await stripe.subscriptions.retrieve(organisation.stripeSubscriptionId)
      if (isSubscriptionActive(subscription.status)) {
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
      // Inactive in Stripe — fall through to new Checkout
    } catch (error: unknown) {
      if (isAppHttpError(error)) throw error

      console.error('[api/billing/checkout] Upgrade error:', error)

      if (isMissingStripeResource(error)) {
        // Stale subscription/customer IDs (common after test↔live key switches)
        await prisma.organisation.update({
          where: { id: organisation.id },
          data: {
            stripeSubscriptionId: null,
            subscriptionStatus: null,
          },
        })
        organisation = {
          ...organisation,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
        }
        // Continue to Checkout below
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: stripeErrorMessage(error) || 'Could not update your subscription',
        })
      }
    }
  }

  async function createCheckoutSession(includeBillingAnchor: boolean) {
    return stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
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
        ...(includeBillingAnchor
          ? {
              billing_cycle_anchor: nextBillingAnchorUnix(),
              proration_behavior: 'create_prorations' as const,
            }
          : {}),
      },
    })
  }

  try {
    const session = await createCheckoutSession(true)
    return { url: session.url, upgraded: false }
  } catch (error: unknown) {
    console.error('[api/billing/checkout] Stripe error:', error)
    const message = stripeErrorMessage(error) || 'Stripe checkout failed'

    if (
      /no such price/i.test(message)
      || (stripeErrorCode(error) === 'resource_missing' && /price/i.test(message))
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Stripe price ID was not found for this API key. Check STRIPE_PRICE_* / STRIPE_TEST_PAYMENT match your secret key mode (test vs live).',
      })
    }

    if (/no such customer/i.test(message)) {
      // Recreate customer once and retry
      await prisma.organisation.update({
        where: { id: organisation.id },
        data: { stripeCustomerId: null },
      })
      try {
        customerId = await ensureStripeCustomer(
          { ...organisation, stripeCustomerId: null },
          user,
        )
        const session = await createCheckoutSession(false)
        return { url: session.url, upgraded: false }
      } catch (retryCustomerError: unknown) {
        throw createError({
          statusCode: 400,
          statusMessage: stripeErrorMessage(retryCustomerError) || message,
        })
      }
    }

    if (/does not allow requests from your ip/i.test(message)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Stripe API key IP restriction blocked checkout. On Netlify use a standard secret key (sk_test_ or sk_live_) or a restricted key (rk_) without IP allowlisting.',
      })
    }

    // Retry once without billing_cycle_anchor — some Stripe configs reject it on Checkout
    if (/billing.?cycle.?anchor/i.test(message)) {
      try {
        const session = await createCheckoutSession(false)
        return { url: session.url, upgraded: false }
      } catch (retryError: unknown) {
        console.error('[api/billing/checkout] Stripe retry error:', retryError)
        throw createError({
          statusCode: 400,
          statusMessage: stripeErrorMessage(retryError) || message,
        })
      }
    }

    if (/^not found$/i.test(message.trim())) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Stripe returned Not Found — usually a missing/mismatched price ID or stale customer. Confirm STRIPE_SECRET_KEY mode matches your price IDs, then try again.',
      })
    }

    throw createError({
      statusCode: 400,
      statusMessage: message,
    })
  }
})

