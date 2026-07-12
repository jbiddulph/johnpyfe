import type { PrismaClient } from '@prisma/client'
import {
  cleanDbString,
  formatPlaceName,
  isPlausibleTownName,
  parseVenueCoord,
  slugifyPlace,
} from '../../utils/format-venue'
import { resolveTown } from './place-hub'
import {
  canonicalCountySlug,
  canonicalUkCountyName,
  countyLookupKey,
  isKnownUkCounty,
} from './uk-counties'
import { nearestSeasideByCoords, normalizeTownKey, seasideTownByName } from './seaside-towns'
import { countVenuesNearPoint, NEARBY_VENUE_RADIUS_MILES } from './venue-nearby'
import { getEventsTopTen } from './events-top-ten'
import { getCountyImageMap, normalizeCountyImageSlug } from './county-images'
import { getStadiumImageMap, normalizeStadiumImageSlug } from './stadium-images'
import { getTownImageMap, normalizeTownImageSlug } from './town-images'

export type HubImageFields = {
  imageUrl?: string | null
  imageAttribution?: string | null
}

export type RankedPlaceRow = {
  slug: string
  name: string
  displayName: string
  venueCount: number
  href: string
} & HubImageFields

function venueGroupCount(row: { _count: { _all?: number } }): number {
  return Number(row._count?._all ?? 0)
}

export type StadiumPubRow = {
  id: number
  slug: string
  club: string
  stadiumName: string
  pubCount: number
  href: string
} & HubImageFields

export async function getTopTowns(prisma: PrismaClient, limit = 10): Promise<RankedPlaceRow[]> {
  const rows = await prisma.venue.groupBy({
    by: ['town'],
    where: { is_live: '1' },
    _count: { _all: true },
  })

  const bySlug = new Map<string, { name: string; displayName: string; venueCount: number }>()

  for (const row of rows) {
    const name = cleanDbString(row.town)
    if (!name || !isPlausibleTownName(name)) continue
    const slug = slugifyPlace(name)
    if (!slug) continue

    const existing = bySlug.get(slug)
    const count = venueGroupCount(row)
    if (existing) {
      existing.venueCount += count
    } else {
      bySlug.set(slug, {
        name,
        displayName: formatPlaceName(name),
        venueCount: count,
      })
    }
  }

  const sorted = [...bySlug.entries()]
    .sort((a, b) => b[1].venueCount - a[1].venueCount)
    .slice(0, limit)

  const result: RankedPlaceRow[] = []
  for (const [slug, data] of sorted) {
    const resolved = await resolveTown(data.name)
    result.push({
      slug: resolved?.slug ?? slug,
      name: data.name,
      displayName: resolved?.displayName ?? data.displayName,
      venueCount: data.venueCount,
      href: resolved?.href ?? `/town/${slug}`,
    })
  }

  return result
}

export async function getTopCounties(prisma: PrismaClient, limit = 10): Promise<RankedPlaceRow[]> {
  const rows = await prisma.venue.groupBy({
    by: ['county'],
    where: { is_live: '1' },
    _count: { _all: true },
  })

  const byCanonical = new Map<string, { name: string; displayName: string; venueCount: number }>()

  for (const row of rows) {
    const raw = cleanDbString(row.county)
    if (!raw || !isKnownUkCounty(raw)) continue

    const canonical = canonicalUkCountyName(raw)!
    const key = countyLookupKey(canonical)!
    const count = venueGroupCount(row)

    const existing = byCanonical.get(key)
    if (existing) {
      existing.venueCount += count
    } else {
      byCanonical.set(key, {
        name: canonical,
        displayName: formatPlaceName(canonical),
        venueCount: count,
      })
    }
  }

  return [...byCanonical.entries()]
    .sort((a, b) => b[1].venueCount - a[1].venueCount)
    .slice(0, limit)
    .map(([key, data]) => {
      const slug = canonicalCountySlug(data.name) ?? key.replace(/\s+/g, '-')
      return {
        slug,
        name: data.name,
        displayName: data.displayName,
        venueCount: data.venueCount,
        href: `/county/${slug}`,
      }
    })
}

export async function getTopSeasideTowns(prisma: PrismaClient, limit = 20): Promise<RankedPlaceRow[]> {
  const venues = await prisma.venue.findMany({
    where: { is_live: '1' },
    select: { town: true, latitude: true, longitude: true },
  })

  const counts = new Map<string, { defKey: string; displayName: string; venueCount: number; name: string }>()

  for (const venue of venues) {
    const townName = cleanDbString(venue.town)
    const byName = townName ? seasideTownByName(townName) : null
    const lat = parseVenueCoord(venue.latitude)
    const lon = parseVenueCoord(venue.longitude)
    const byCoords = lat != null && lon != null ? nearestSeasideByCoords(lat, lon) : null

    const def = byName ?? byCoords?.def
    if (!def) continue

    const existing = counts.get(def.key)
    if (existing) {
      existing.venueCount++
    } else {
      counts.set(def.key, {
        defKey: def.key,
        displayName: def.displayName,
        venueCount: 1,
        name: def.displayName,
      })
    }
  }

  const sorted = [...counts.values()]
    .sort((a, b) => b.venueCount - a.venueCount)
    .slice(0, limit)

  const result: RankedPlaceRow[] = []
  for (const row of sorted) {
    const resolved = await resolveTown(row.name)
    result.push({
      slug: resolved?.slug ?? row.defKey,
      name: row.name,
      displayName: row.displayName,
      venueCount: row.venueCount,
      href: resolved?.href ?? `/town/${row.defKey}`,
    })
  }

  return result
}

export async function getPremierLeagueStadiumPubs(prisma: PrismaClient): Promise<StadiumPubRow[]> {
  const stadiums = await prisma.stadium.findMany({
    orderBy: { club: 'asc' },
  })

  const rows = await Promise.all(
    stadiums.map(async (stadium) => {
      const lat = Number(stadium.latitude)
      const lon = Number(stadium.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

      const pubCount = await countVenuesNearPoint(prisma, lat, lon, NEARBY_VENUE_RADIUS_MILES)
      const slug = slugifyPlace(stadium.club) || `stadium-${stadium.id}`

      return {
        id: Number(stadium.id),
        slug,
        club: stadium.club,
        stadiumName: stadium.stadium_name,
        pubCount,
        href: `/pubs-near-stadiums/${slug}`,
      } satisfies StadiumPubRow
    }),
  )

  return rows.filter((r): r is StadiumPubRow => r != null).sort((a, b) => b.pubCount - a.pubCount)
}

export type RankedEventPlaceRow = RankedPlaceRow & {
  meta?: string
}

export async function getHomepageStats(prisma: PrismaClient) {
  const [topTowns, topCounties, topSeasideTowns, stadiumPubs, eventsTopTen] = await Promise.all([
    getTopTowns(prisma, 10),
    getTopCounties(prisma, 10),
    getTopSeasideTowns(prisma, 20),
    getPremierLeagueStadiumPubs(prisma),
    getEventsTopTen(prisma, 10).catch((error) => {
      console.error('[homepage-stats] events top ten failed:', error)
      return { limitedVenues: [], limitedTowns: [] }
    }),
  ])

  const [countyImages, townImages, stadiumImages] = await Promise.all([
    getCountyImageMap(prisma, topCounties.map((row) => normalizeCountyImageSlug(row.slug))),
    getTownImageMap(prisma, [
      ...topCounties.map((row) => normalizeTownImageSlug(row.slug)),
      ...topSeasideTowns.map((row) => normalizeTownImageSlug(row.slug)),
    ]),
    getStadiumImageMap(prisma, stadiumPubs.map((row) => normalizeStadiumImageSlug(row.slug))),
  ])

  const countiesWithImages = topCounties.map((row) => {
    const townImage = townImages.get(normalizeTownImageSlug(row.slug))
    const countyImage = countyImages.get(normalizeCountyImageSlug(row.slug))
    const image = townImage ?? countyImage
    return {
      ...row,
      imageUrl: image?.photoUrl ?? null,
      backupImageUrl: townImage ? countyImage?.photoUrl ?? null : null,
      imageAttribution: image?.attribution ?? null,
      backupImageAttribution: townImage ? countyImage?.attribution ?? null : null,
    }
  })

  const seasideWithImages = topSeasideTowns.map((row) => {
    const key = normalizeTownImageSlug(row.slug)
    const image = townImages.get(key)
    return {
      ...row,
      imageUrl: image?.photoUrl ?? null,
      imageAttribution: image?.attribution ?? null,
    }
  })

  const stadiumsWithImages = stadiumPubs.map((row) => {
    const key = normalizeStadiumImageSlug(row.slug)
    const image = stadiumImages.get(key)
    return {
      ...row,
      imageUrl: image?.photoUrl ?? null,
      imageAttribution: image?.attribution ?? null,
    }
  })

  const topVenuesWithEvents: RankedEventPlaceRow[] = eventsTopTen.limitedVenues.map((venue) => ({
    slug: venue.slug,
    name: venue.venueName,
    displayName: venue.venueName,
    meta: venue.town,
    venueCount: venue.count,
    href: venue.href,
  }))

  const topTownsWithEvents: RankedPlaceRow[] = eventsTopTen.limitedTowns.map((town) => ({
    slug: town.slug,
    name: town.town,
    displayName: town.town,
    venueCount: town.eventCount,
    href: town.href,
  }))

  return {
    topTowns,
    topCounties: countiesWithImages,
    topSeasideTowns: seasideWithImages,
    topVenuesWithEvents,
    topTownsWithEvents,
    stadiumPubs: stadiumsWithImages,
    stadiumRadiusMiles: NEARBY_VENUE_RADIUS_MILES,
  }
}
