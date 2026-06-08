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

export function canClaimMorePubs(organisation: Organisation, verifiedClaimCount: number): boolean {
  if (!organisationHasProAccess(organisation)) return false
  const plan = getBillingPlan(organisation.plan)
  if (!plan) return false
  return verifiedClaimCount < plan.pubLimit
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
