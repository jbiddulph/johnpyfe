import { prisma } from '../../utils/prisma'
import {
  canClaimMorePubs,
  countVerifiedClaims,
  getMembershipForUser,
  getOrCreateOrganisationForUser,
  organisationHasProAccess,
} from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'

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

  const displayName = String(user.user_metadata?.name || user.email?.split('@')[0] || 'My pubs')
  const organisation = await getOrCreateOrganisationForUser(user.id, displayName)

  const membership = await getMembershipForUser(user.id)
  const verifiedCount = membership ? countVerifiedClaims(membership.organisation.claims) : 0
  if (
    organisationHasProAccess(organisation)
    && !canClaimMorePubs(organisation, verifiedCount)
  ) {
    throw createError({
      statusCode: 402,
      statusMessage: 'Your plan pub limit has been reached — upgrade to claim more',
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
