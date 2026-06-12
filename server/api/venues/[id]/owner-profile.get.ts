import { prisma } from '../../../utils/prisma'
import { isSubscriptionActive } from '../../../utils/billing-plans'
import { sanitizeSocialLinks } from '../../../utils/venue-profile'

/** Public owner branding shown on verified, subscribed pub pages. */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-cache')
  const id = Number.parseInt(String(event.context.params?.id ?? ''), 10)
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  const claim = await prisma.venueClaim.findUnique({
    where: { venueId: id },
    include: {
      organisation: {
        select: { subscriptionStatus: true },
      },
    },
  })

  if (!claim || claim.status !== 'verified' || !isSubscriptionActive(claim.organisation.subscriptionStatus)) {
    return null
  }

  const profile = await prisma.venueProfile.findUnique({ where: { venueId: id } })
  if (!profile) return { verified: true, profile: null }

  return {
    verified: true,
    profile: {
      logoUrl: profile.logoUrl,
      headerImageUrl: profile.headerImageUrl,
      menuFoodUrl: profile.menuFoodUrl,
      menuDrinksUrl: profile.menuDrinksUrl,
      socialLinks: sanitizeSocialLinks(profile.socialLinks as Record<string, string> | null),
      customDescription: profile.customDescription,
    },
  }
})
