import type Stripe from 'stripe'
import { prisma } from './prisma'
import { getBillingPlan, planIdFromStripePriceId, type BillingPlanId } from './billing-plans'

/** Basil API (2025-03-31+) moved period fields onto subscription items. */
function subscriptionPeriodEndUnix(subscription: Stripe.Subscription): number | null {
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
  if (typeof legacy === 'number' && legacy > 0) return legacy

  const itemEnds = subscription.items?.data
    ?.map((item) => (item as Stripe.SubscriptionItem & { current_period_end?: number }).current_period_end)
    .filter((value): value is number => typeof value === 'number' && value > 0) ?? []

  if (!itemEnds.length) return null
  return Math.max(...itemEnds)
}

function subscriptionPeriodEndDate(subscription: Stripe.Subscription): Date | null {
  const unix = subscriptionPeriodEndUnix(subscription)
  if (!unix) return null
  const date = new Date(unix * 1000)
  return Number.isNaN(date.getTime()) ? null : date
}

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
      currentPeriodEnd: subscriptionPeriodEndDate(subscription),
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
