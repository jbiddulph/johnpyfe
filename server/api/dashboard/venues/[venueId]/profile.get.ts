import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { requireAuth } from '../../../../utils/require-auth'
import { prisma } from '../../../../utils/prisma'
import { mergeHeaderImageUrls, resolveVenueHeaderImageUrls } from '../../../../utils/venue-profile'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  await requireVerifiedClaimAccess(user.id, venueId)

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabase?.url
  const profile = await prisma.venueProfile.findUnique({ where: { venueId } })
  const empty = {
    venueId,
    logoUrl: null,
    headerImageUrl: null,
    headerImageUrls: [] as string[],
    headerImagePublicUrls: [] as string[],
    menuFoodUrl: null,
    menuDrinksUrl: null,
    socialLinks: null,
    customDescription: null,
  }

  if (!profile) return empty

  const storedPaths = mergeHeaderImageUrls(profile)

  return {
    ...profile,
    headerImageUrls: storedPaths,
    headerImagePublicUrls: resolveVenueHeaderImageUrls(profile, supabaseUrl),
  }
})
