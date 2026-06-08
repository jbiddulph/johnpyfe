import type Stripe from 'stripe'
import { prisma } from './prisma'
import { getBillingPlan, planIdFromStripePriceId, type BillingPlanId } from './billing-plans'

export async function syncOrganisationFromSubscription(
  organisationId: string,
  subscription: Stripe.Subscription,
) {
  const priceId = subscription.items.data[0]?.price?.id
  const planFromPrice = priceId ? planIdFromStripePriceId(priceId) : null
  const metaPlan = String(subscription.metadata?.plan || '').trim() as BillingPlanId
  const plan = planFromPrice || (getBillingPlan(metaPlan) ? metaPlan : null)

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
