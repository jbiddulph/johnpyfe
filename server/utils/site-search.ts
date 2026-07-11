import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import {
  cityHubSlug,
  cleanDbString,
  formatPlaceName,
  isPlausibleTownName,
  slugifyPlace,
} from '../../utils/format-venue'
import {
  canonicalCountySlug,
  canonicalUkCountyName,
  isKnownUkCounty,
} from './uk-counties'
import { paginatedVenueResponse, venueHubSelect } from './venue-list'

export const SITE_SEARCH_MIN_LENGTH = 2
const TOWN_LIMIT = 15
const COUNTY_LIMIT = 10
export const SITE_SEARCH_VENUE_PAGE_SIZE = 24

export type SearchTownResult = {
  slug: string
  name: string
  displayName: string
  href: string
  venueCount: number
}

export type SearchCountyResult = {
  slug: string
  name: string
  displayName: string
  href: string
  venueCount: number
}

function relevanceScore(name: string, q: string): number {
  const lower = name.toLowerCase()
  const query = q.toLowerCase()
  if (lower === query) return 0
  if (lower.startsWith(query)) return 1
  return 2
}

async function searchTowns(q: string): Promise<SearchTownResult[]> {
  const bySlug = new Map<string, SearchTownResult>()

  const [cities, townRows] = await Promise.all([
    prisma.city.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { slug: true, name: true },
      take: TOWN_LIMIT * 2,
      orderBy: { name: 'asc' },
    }),
    prisma.venue.groupBy({
      by: ['town'],
      where: {
        is_live: '1',
        town: { contains: q, mode: 'insensitive' },
      },
      _count: { _all: true },
      orderBy: { town: 'asc' },
      take: TOWN_LIMIT * 3,
    }),
  ])

  for (const city of cities) {
    const slug = cityHubSlug(city.name, city.slug)
    if (bySlug.has(slug)) continue
    bySlug.set(slug, {
      slug,
      name: city.name,
      displayName: formatPlaceName(city.name),
      href: `/town/${slug}`,
      venueCount: 0,
    })
  }

  for (const row of townRows) {
    const name = cleanDbString(row.town)
    if (!name || !isPlausibleTownName(name)) continue
    const slug = slugifyPlace(name)
    if (!slug) continue

    const existing = bySlug.get(slug)
    const count = Number(row._count?._all ?? 0)
    if (existing) {
      existing.venueCount = Math.max(existing.venueCount, count)
      continue
    }

    bySlug.set(slug, {
      slug,
      name,
      displayName: formatPlaceName(name),
      href: `/town/${slug}`,
      venueCount: count,
    })
  }

  const slugsNeedingCount = [...bySlug.values()]
    .filter((town) => town.venueCount === 0)
    .map((town) => town.name)

  if (slugsNeedingCount.length) {
    const countRows = await prisma.venue.groupBy({
      by: ['town'],
      where: {
        is_live: '1',
        OR: slugsNeedingCount.map((name) => ({
          town: { equals: name, mode: 'insensitive' as const },
        })),
      },
      _count: { _all: true },
    })

    for (const row of countRows) {
      const name = cleanDbString(row.town)
      if (!name) continue
      const slug = slugifyPlace(name)
      const town = bySlug.get(slug)
      if (town) {
        town.venueCount = Number(row._count?._all ?? 0)
      }
    }
  }

  return [...bySlug.values()]
    .sort((a, b) => {
      const sa = relevanceScore(a.displayName, q)
      const sb = relevanceScore(b.displayName, q)
      if (sa !== sb) return sa - sb
      return b.venueCount - a.venueCount
    })
    .slice(0, TOWN_LIMIT)
}

async function searchCounties(q: string): Promise<SearchCountyResult[]> {
  const rows = await prisma.venue.groupBy({
    by: ['county'],
    where: {
      is_live: '1',
      county: { contains: q, mode: 'insensitive' },
    },
    _count: { _all: true },
  })

  const bySlug = new Map<string, SearchCountyResult>()

  for (const row of rows) {
    const raw = cleanDbString(row.county)
    if (!raw || !isKnownUkCounty(raw)) continue

    const canonical = canonicalUkCountyName(raw)!
    const slug = canonicalCountySlug(canonical)!
    const count = Number(row._count?._all ?? 0)
    const existing = bySlug.get(slug)

    if (existing) {
      existing.venueCount += count
    } else {
      bySlug.set(slug, {
        slug,
        name: canonical,
        displayName: formatPlaceName(canonical),
        href: `/county/${slug}`,
        venueCount: count,
      })
    }
  }

  return [...bySlug.values()]
    .sort((a, b) => {
      const sa = relevanceScore(a.displayName, q)
      const sb = relevanceScore(b.displayName, q)
      if (sa !== sb) return sa - sb
      return b.venueCount - a.venueCount
    })
    .slice(0, COUNTY_LIMIT)
}

async function searchVenues(q: string, skip: number, take: number) {
  const where: Prisma.VenueWhereInput = {
    is_live: '1',
    slug: { not: '' },
    OR: [
      { venuename: { contains: q, mode: 'insensitive' } },
      { town: { contains: q, mode: 'insensitive' } },
      { county: { contains: q, mode: 'insensitive' } },
    ],
  }

  const [items, total] = await prisma.$transaction([
    prisma.venue.findMany({
      where,
      select: venueHubSelect,
      orderBy: { venuename: 'asc' },
      skip,
      take,
    }),
    prisma.venue.count({ where }),
  ])

  return paginatedVenueResponse(items, total, skip, take)
}

export async function runSiteSearch(q: string, skip = 0, take = SITE_SEARCH_VENUE_PAGE_SIZE) {
  const query = q.trim()

  if (query.length < SITE_SEARCH_MIN_LENGTH) {
    return {
      query,
      towns: [] as SearchTownResult[],
      counties: [] as SearchCountyResult[],
      venues: paginatedVenueResponse([], 0, skip, take),
    }
  }

  const [towns, counties, venues] = await Promise.all([
    searchTowns(query),
    searchCounties(query),
    searchVenues(query, skip, take),
  ])

  return { query, towns, counties, venues }
}
