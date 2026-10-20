import { prisma } from '../../utils/prisma'
import {
  claimBlockReason,
  countVerifiedClaims,
  getMembershipForUser,
} from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'

const SUBSCRIPTION_REQUIRED_MESSAGE
  = 'An active subscription is required before you can claim a venue — choose a plan in Billing (from £4.99/month), then try again'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const venueId = Number.parseInt(String(body?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'venueId is required' })
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, venuename: true, slug: true, town: true },
  })
  if (!venue) {
    throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
  }

  const existingClaim = await prisma.venueClaim.findUnique({ where: { venueId } })
  if (existingClaim) {
    throw createError({ statusCode: 409, statusMessage: 'This pub has already been claimed' })
  }

  // Claiming is a paid feature: the user must subscribe (via /dashboard/billing → Stripe)
  // before a claim can be requested. Checkout creates the organisation, so no membership
  // means no subscription yet — bail out without creating an empty organisation.
  const membership = await getMembershipForUser(user.id)
  if (!membership) {
    throw createError({
      statusCode: 402,
      statusMessage: SUBSCRIPTION_REQUIRED_MESSAGE,
      data: { reason: 'subscription_required' },
    })
  }

  const organisation = membership.organisation
  const verifiedCount = countVerifiedClaims(organisation.claims)
  const blockReason = claimBlockReason(organisation, verifiedCount)
  if (blockReason === 'subscription_required') {
    throw createError({
      statusCode: 402,
      statusMessage: SUBSCRIPTION_REQUIRED_MESSAGE,
      data: { reason: blockReason },
    })
  }
  if (blockReason === 'plan_limit') {
    throw createError({
      statusCode: 402,
      statusMessage: 'Your plan pub limit has been reached — open Billing and choose a higher plan, then try again',
      data: { reason: blockReason },
    })
  }

  const claim = await prisma.venueClaim.create({
    data: {
      venueId,
      organisationId: organisation.id,
      status: 'pending',
    },
    include: {
      venue: {
        select: { id: true, venuename: true, slug: true, town: true },
      },
    },
  })

  return {
    claim: {
      id: claim.id,
      venueId: claim.venueId,
      status: claim.status,
      requestedAt: claim.requestedAt,
      venue: claim.venue,
    },
    message: 'Claim submitted. We will verify ownership before your listing is marked as claimed.',
  }
})
