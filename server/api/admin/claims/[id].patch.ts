import { prisma } from '../../../utils/prisma'
import {
  canClaimMorePubs,
  countVerifiedClaims,
  organisationHasProAccess,
} from '../../../utils/organisation-access'
import { requireAdmin } from '../../../utils/require-admin'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const claimId = String(event.context.params?.id ?? '').trim()
  const body = await readBody(event)
  const status = String(body?.status ?? '').trim()

  if (!['verified', 'rejected', 'revoked'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'status must be verified, rejected, or revoked' })
  }

  const claim = await prisma.venueClaim.findUnique({
    where: { id: claimId },
    include: {
      organisation: {
        include: { claims: true },
      },
    },
  })

  if (!claim) {
    throw createError({ statusCode: 404, statusMessage: 'Claim not found' })
  }

  if (status === 'verified') {
    const verifiedCount = countVerifiedClaims(
      claim.organisation.claims.filter((item) => item.id !== claim.id),
    )
    if (
      organisationHasProAccess(claim.organisation)
      && !canClaimMorePubs(claim.organisation, verifiedCount)
    ) {
      throw createError({
        statusCode: 402,
        statusMessage: 'Organisation has reached its plan pub limit',
      })
    }
  }

  const updated = await prisma.venueClaim.update({
    where: { id: claimId },
    data: {
      status,
      verifiedAt: status === 'verified' ? new Date() : null,
      verifiedBy: status === 'verified' ? admin.id : null,
    },
    include: {
      venue: {
        select: { id: true, venuename: true, slug: true, town: true },
      },
      organisation: {
        select: { id: true, name: true, plan: true, subscriptionStatus: true },
      },
    },
  })

  return updated
})
