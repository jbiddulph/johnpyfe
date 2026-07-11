import { prisma } from '../../utils/prisma'
import { enrichCountiesWithImages } from '../../utils/county-images'
import { listCountySlugs } from '../../utils/place-hub'

/** All county hub pages with venue counts and optional hero images. */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

  const config = useRuntimeConfig()
  const counties = await listCountySlugs()
  const sorted = counties
    .map((county) => ({
      ...county,
      href: `/county/${county.slug}`,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const enriched = await enrichCountiesWithImages(
    prisma,
    sorted,
    config.googlePlacesApiKey || undefined,
  )

  return enriched.map((county) => ({
    ...county,
    href: `/county/${county.slug}`,
  }))
})
