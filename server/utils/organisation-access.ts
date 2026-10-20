import type { Organisation, VenueClaim } from '@prisma/client'
import { prisma } from './prisma'
import { getBillingPlan, isSubscriptionActive, type BillingPlanId } from './billing-plans'

export async function getMembershipForUser(userId: string) {
  return prisma.organisationMember.findFirst({
    where: { userId },
    include: {
      organisation: {
        include: {
          claims: {
            include: {
              venue: {
                select: { id: true, venuename: true, slug: true, town: true },
              },
            },
            orderBy: { requestedAt: 'desc' },
          },
        },
      },
    },
  })
}

export async function getOrCreateOrganisationForUser(userId: string, displayName: string) {
  const existing = await getMembershipForUser(userId)
  if (existing) return existing.organisation

  const orgName = displayName.trim() || 'My pub company'
  return prisma.organisation.create({
    data: {
      name: orgName,
      members: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
  })
}

export function countVerifiedClaims(claims: VenueClaim[]): number {
  return claims.filter((claim) => claim.status === 'verified').length
}

export function organisationHasProAccess(organisation: Organisation): boolean {
  return isSubscriptionActive(organisation.subscriptionStatus)
}

export type ClaimBlockReason = 'subscription_required' | 'plan_limit'

/**
 * Why the organisation cannot claim another pub right now, or null if it can.
 * Claiming requires an active Stripe subscription (plans start at Solo, £4.99/month);
 * paid orgs are then limited by their plan's pubLimit (verified claims only).
 * An active subscription with an unknown plan must not be treated as "at limit".
 */
export function claimBlockReason(
  organisation: Organisation,
  verifiedClaimCount: number,
): ClaimBlockReason | null {
  if (!organisationHasProAccess(organisation)) return 'subscription_required'
  // Fall back to Solo if plan sync left plan as "none" but subscription is active
  const plan = getBillingPlan(organisation.plan) || getBillingPlan('solo')
  if (!plan) return null
  return verifiedClaimCount < plan.pubLimit ? null : 'plan_limit'
}

/** Whether the organisation may claim another pub (subscribed and under its plan limit). */
export function canClaimMorePubs(organisation: Organisation, verifiedClaimCount: number): boolean {
  return claimBlockReason(organisation, verifiedClaimCount) === null
}

export async function requireVerifiedClaimAccess(userId: string, venueId: number) {
  const membership = await getMembershipForUser(userId)
  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'No organisation membership found' })
  }

  const claim = membership.organisation.claims.find((item) => item.venueId === venueId)
  if (!claim || claim.status !== 'verified') {
    throw createError({ statusCode: 403, statusMessage: 'Verified claim required for this pub' })
  }

  if (!organisationHasProAccess(membership.organisation)) {
    throw createError({ statusCode: 402, statusMessage: 'Active subscription required' })
  }

  return { membership, claim, organisation: membership.organisation }
}

export function recommendedPlanForPubCount(count: number): BillingPlanId {
  if (count <= 1) return 'solo'
  if (count <= 5) return 'group'
  if (count <= 25) return 'regional'
  return 'enterprise'
}
