import type Stripe from 'stripe'
import { prisma } from './prisma'
import { planIdFromStripePriceId } from './billing-plans'

export async function syncOrganisationFromSubscription(
  organisationId: string,
  subscription: Stripe.Subscription,
) {
  const priceId = subscription.items.data[0]?.price?.id
  const plan = priceId ? planIdFromStripePriceId(priceId) : null

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: String(subscription.customer),
      plan: plan ?? 'none',
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })
}

export async function clearOrganisationSubscription(organisationId: string) {
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      stripeSubscriptionId: null,
      plan: 'none',
      subscriptionStatus: 'canceled',
      currentPeriodEnd: null,
    },
  })
}
