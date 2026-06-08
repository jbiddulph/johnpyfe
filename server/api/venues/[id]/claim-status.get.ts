import { prisma } from '../../../utils/prisma'
import { isSubscriptionActive } from '../../../utils/billing-plans'

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(String(event.context.params?.id ?? ''), 10)
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  const claim = await prisma.venueClaim.findUnique({
    where: { venueId: id },
    include: {
      organisation: {
        select: {
          plan: true,
          subscriptionStatus: true,
        },
      },
      venue: {
        select: { id: true, venuename: true },
      },
    },
  })

  if (!claim) {
    return { claimed: false, verified: false, hasProProfile: false }
  }

  const verified = claim.status === 'verified'
  const hasPro = verified && isSubscriptionActive(claim.organisation.subscriptionStatus)

  const profile = hasPro
    ? await prisma.venueProfile.findUnique({ where: { venueId: id } })
    : null

  return {
    claimed: true,
    verified,
    hasProProfile: Boolean(profile && (profile.logoUrl || profile.headerImageUrl || profile.customDescription)),
    status: claim.status,
  }
})
