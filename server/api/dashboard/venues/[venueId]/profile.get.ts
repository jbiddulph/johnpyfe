import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { requireAuth } from '../../../../utils/require-auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  await requireVerifiedClaimAccess(user.id, venueId)

  const profile = await prisma.venueProfile.findUnique({ where: { venueId } })
  return profile ?? {
    venueId,
    logoUrl: null,
    headerImageUrl: null,
    menuFoodUrl: null,
    menuDrinksUrl: null,
    socialLinks: null,
    customDescription: null,
  }
})
