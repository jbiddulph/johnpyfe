import {
  BILLING_PLANS,
  getBillingPlan,
  getStripeTestPaymentPriceId,
  isStripeTestMode,
} from '../../utils/billing-plans'
import {
  claimBlockReason,
  countVerifiedClaims,
  getMembershipForUser,
  organisationHasProAccess,
  recommendedPlanForPubCount,
} from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const membership = await getMembershipForUser(user.id)

  const stripeTestMode = isStripeTestMode()
  const stripeTestPaymentConfigured = Boolean(getStripeTestPaymentPriceId())

  if (!membership) {
    return {
      hasOrganisation: false,
      stripeTestMode,
      stripeTestPaymentConfigured,
      plans: BILLING_PLANS.map(({ id, label, monthlyGbp, pubLimit }) => ({
        id,
        label,
        monthlyGbp,
        pubLimit,
      })),
    }
  }

  const organisation = membership.organisation
  const verifiedClaims = countVerifiedClaims(organisation.claims)
  const hasPro = organisationHasProAccess(organisation)
  // Fall back to Solo when subscription is active but plan sync left "none"
  const plan = getBillingPlan(organisation.plan)
    || (hasPro ? getBillingPlan('solo') : null)
  const blockReason = claimBlockReason(organisation, verifiedClaims)

  return {
    hasOrganisation: true,
    stripeTestMode,
    stripeTestPaymentConfigured,
    organisation: {
      id: organisation.id,
      name: organisation.name,
      plan: plan?.id || organisation.plan,
      planLabel: plan?.label ?? null,
      pubLimit: plan?.pubLimit ?? 0,
      subscriptionStatus: organisation.subscriptionStatus,
      currentPeriodEnd: organisation.currentPeriodEnd,
      verifiedClaimCount: verifiedClaims,
      canClaimMore: blockReason === null,
      claimBlockReason: blockReason,
      hasProAccess: hasPro,
      recommendedPlan: recommendedPlanForPubCount(Math.max(verifiedClaims, 1)),
    },
    claims: organisation.claims.map((claim) => ({
      id: claim.id,
      venueId: claim.venueId,
      status: claim.status,
      requestedAt: claim.requestedAt,
      verifiedAt: claim.verifiedAt,
      venue: claim.venue,
    })),
    plans: BILLING_PLANS.map(({ id, label, monthlyGbp, pubLimit }) => ({
      id,
      label,
      monthlyGbp,
      pubLimit,
    })),
  }
})
