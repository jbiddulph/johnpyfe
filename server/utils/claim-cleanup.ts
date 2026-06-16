import { prisma } from './prisma'

type RevokeClaimResult = {
  deleted: true
  claimId: string
  venueId: number
  organisationId: string
  organisationDeleted: boolean
}

/** Remove a revoked claim and related owner records from the database. */
export async function deleteClaimAndRelatedRecords(claimId: string): Promise<RevokeClaimResult> {
  const claim = await prisma.venueClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      venueId: true,
      organisationId: true,
    },
  })

  if (!claim) {
    throw createError({ statusCode: 404, statusMessage: 'Claim not found' })
  }

  const organisationDeleted = await prisma.$transaction(async (tx) => {
    await tx.venueProfile.deleteMany({ where: { venueId: claim.venueId } })
    await tx.venueClaim.delete({ where: { id: claim.id } })

    const remainingClaims = await tx.venueClaim.count({
      where: { organisationId: claim.organisationId },
    })

    if (remainingClaims > 0) return false

    await tx.organisation.delete({ where: { id: claim.organisationId } })
    return true
  })

  return {
    deleted: true,
    claimId: claim.id,
    venueId: claim.venueId,
    organisationId: claim.organisationId,
    organisationDeleted,
  }
}
