import { BILLING_PLANS, getBillingPlan } from '../../utils/billing-plans'
import {
  canClaimMorePubs,
  countVerifiedClaims,
  getMembershipForUser,
  organisationHasProAccess,
  recommendedPlanForPubCount,
} from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const membership = await getMembershipForUser(user.id)

  if (!membership) {
    return {
      hasOrganisation: false,
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
  const plan = getBillingPlan(organisation.plan)
  const hasPro = organisationHasProAccess(organisation)

  return {
    hasOrganisation: true,
    organisation: {
      id: organisation.id,
      name: organisation.name,
      plan: organisation.plan,
      planLabel: plan?.label ?? null,
      pubLimit: plan?.pubLimit ?? 0,
      subscriptionStatus: organisation.subscriptionStatus,
      currentPeriodEnd: organisation.currentPeriodEnd,
      verifiedClaimCount: verifiedClaims,
      canClaimMore: canClaimMorePubs(organisation, verifiedClaims),
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
