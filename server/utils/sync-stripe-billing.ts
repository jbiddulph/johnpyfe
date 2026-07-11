import type Stripe from 'stripe'
import { prisma } from './prisma'
import { syncOrganisationFromSubscription } from './sync-stripe-subscription'
import { getStripe } from './stripe'

const SYNCABLE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export async function syncOrganisationFromCheckoutSession(
  organisationId: string,
  session: Stripe.Checkout.Session,
  stripe = getStripe(),
) {
  if (session.customer) {
    await prisma.organisation.update({
      where: { id: organisationId },
      data: { stripeCustomerId: String(session.customer) },
    })
  }

  if (!session.subscription) {
    return { synced: false, reason: 'No subscription on checkout session' }
  }

  const subscription = await stripe.subscriptions.retrieve(String(session.subscription))
  await syncOrganisationFromSubscription(organisationId, subscription)

  return {
    synced: true,
    status: subscription.status,
    plan: subscription.metadata?.plan ?? null,
  }
}

export async function syncOrganisationFromStripeCustomer(organisationId: string, customerId: string) {
  const stripe = getStripe()
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
  })

  const match = subscriptions.data.find((sub) => SYNCABLE_STATUSES.has(sub.status))
  if (!match) {
    return { synced: false, reason: 'No active subscription found for customer' }
  }

  await syncOrganisationFromSubscription(organisationId, match)
  return { synced: true, status: match.status }
}

/** Find a subscription in Stripe when the DB was never linked (webhook miss, etc.). */
export async function syncOrganisationFromStripeSearch(organisationId: string) {
  const stripe = getStripe()

  try {
    const subscriptionSearch = await stripe.subscriptions.search({
      query: `metadata['organisationId']:'${organisationId}'`,
      limit: 5,
    })

    const subscriptionMatch = subscriptionSearch.data.find((sub) => SYNCABLE_STATUSES.has(sub.status))
    if (subscriptionMatch) {
      await syncOrganisationFromSubscription(organisationId, subscriptionMatch)
      return { synced: true, status: subscriptionMatch.status, source: 'subscription_metadata' }
    }

    const customerSearch = await stripe.customers.search({
      query: `metadata['organisationId']:'${organisationId}'`,
      limit: 1,
    })

    const customer = customerSearch.data[0]
    if (customer) {
      await prisma.organisation.update({
        where: { id: organisationId },
        data: { stripeCustomerId: customer.id },
      })
      return syncOrganisationFromStripeCustomer(organisationId, customer.id)
    }
  } catch (error) {
    console.error('[sync-stripe-billing] Stripe search failed:', error)
  }

  return { synced: false, reason: 'No Stripe subscription found for this organisation' }
}

export async function resolveOrganisationIdForSubscription(subscription: Stripe.Subscription) {
  const fromMeta = String(subscription.metadata?.organisationId || '').trim()
  if (fromMeta) return fromMeta

  const customerId = String(subscription.customer || '')
  if (!customerId) return null

  const org = await prisma.organisation.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })
  return org?.id ?? null
}
