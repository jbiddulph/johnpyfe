import { prisma } from '../../utils/prisma'
import { cleanDbString, slugifyPlace } from '../../../utils/format-venue'

function parseCoord(value: string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0 ? n : null
}

/** Lightweight venue points for clustered hub maps. */
export default defineEventHandler(async () => {
  const rows = await prisma.venue.findMany({
    where: { slug: { not: '' } },
    select: {
      id: true,
      slug: true,
      venuename: true,
      latitude: true,
      longitude: true,
      county: true,
    },
  })

  return rows
    .map((venue) => {
      const lat = parseCoord(venue.latitude)
      const lng = parseCoord(venue.longitude)
      if (lat == null || lng == null) return null

      const countyName = cleanDbString(venue.county)
      return {
        id: venue.id,
        slug: venue.slug,
        venuename: venue.venuename,
        latitude: String(lat),
        longitude: String(lng),
        county: countyName,
        countySlug: countyName ? slugifyPlace(countyName) : '',
      }
    })
    .filter(Boolean)
})
