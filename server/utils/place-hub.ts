import { prisma } from './prisma'
import { cleanDbString, formatPlaceName, slugifyPlace } from '../../utils/format-venue'
import {
  canonicalCountySlug,
  canonicalUkCountyName,
  countyLookupKey,
  isKnownUkCounty,
} from './uk-counties'

export type ResolvedPlace = {
  slug: string
  name: string
  displayName: string
  href: string
}

export async function resolveTown(townName: string): Promise<ResolvedPlace | null> {
  const name = cleanDbString(townName)
  if (!name) return null

  const city = await prisma.city.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { slug: true, name: true },
  })

  if (city) {
    return {
      slug: city.slug,
      name: city.name,
      displayName: city.name,
      href: `/town/${city.slug}`,
    }
  }

  const slug = slugifyPlace(name)
  if (!slug) return null
  return {
    slug,
    name,
    displayName: formatPlaceName(name),
    href: `/town/${slug}`,
  }
}

export async function resolveCounty(countyName: string): Promise<ResolvedPlace | null> {
  const raw = cleanDbString(countyName)
  if (!raw || !isKnownUkCounty(raw)) return null
  const canonical = canonicalUkCountyName(raw)!
  const slug = canonicalCountySlug(canonical)
  if (!slug) return null
  return {
    slug,
    name: canonical,
    displayName: formatPlaceName(canonical),
    href: `/county/${slug}`,
  }
}

/** Match a county slug to the canonical county (handles SUFFOLK vs Suffolk, excludes town names in county column). */
export async function findCountyBySlug(slug: string): Promise<{
  name: string
  displayName: string
  slug: string
  /** Raw Venue.county values that map to this canonical county. */
  countyValues: string[]
} | null> {
  const rows = await prisma.venue.groupBy({
    by: ['county'],
    where: { is_live: '1' },
  })

  const matches = rows
    .map((r) => cleanDbString(r.county))
    .filter((name): name is string => Boolean(name))
    .filter((name) => isKnownUkCounty(name))
    .filter((name) => canonicalCountySlug(name) === slug)

  if (!matches.length) return null

  const canonical = canonicalUkCountyName(matches[0])!
  const countyValues = [...new Set(matches)]

  return {
    name: canonical,
    displayName: formatPlaceName(canonical),
    slug: canonicalCountySlug(canonical) ?? slug,
    countyValues,
  }
}

/** Match a town slug via City table or venue town names. */
export async function findTownBySlug(slug: string): Promise<{
  name: string
  displayName: string
  slug: string
  source: 'city' | 'venue'
} | null> {
  const city = await prisma.city.findUnique({
    where: { slug },
    select: { slug: true, name: true },
  })
  if (city) {
    return {
      name: city.name,
      displayName: city.name,
      slug: city.slug,
      source: 'city',
    }
  }

  const towns = await prisma.venue.groupBy({
    by: ['town'],
    where: { is_live: '1' },
  })

  const matches = towns
    .map((r) => cleanDbString(r.town))
    .filter((name): name is string => Boolean(name))
    .filter((name) => slugifyPlace(name) === slug)

  if (!matches.length) return null

  let bestName = matches[0]
  let bestCount = 0
  for (const candidate of [...new Set(matches)]) {
    const count = await prisma.venue.count({
      where: {
        is_live: '1',
        town: { equals: candidate, mode: 'insensitive' },
      },
    })
    if (count > bestCount) {
      bestCount = count
      bestName = candidate
    }
  }

  return {
    name: bestName,
    displayName: formatPlaceName(bestName),
    slug: slugifyPlace(bestName),
    source: 'venue',
  }
}

export async function getDominantCountyForTown(townName: string) {
  const rows = await prisma.venue.groupBy({
    by: ['county'],
    where: {
      town: { equals: townName, mode: 'insensitive' },
    },
    _count: { _all: true },
  })

  const sorted = [...rows].sort((a, b) => b._count._all - a._count._all)
  const top = sorted.find((r) => cleanDbString(r.county))
  if (!top) return null
  const name = cleanDbString(top.county)!
  return {
    name,
    displayName: formatPlaceName(name),
    slug: slugifyPlace(name),
  }
}

export async function listTownSlugs(): Promise<Array<{ slug: string; name: string; displayName: string }>> {
  const cities = await prisma.city.findMany({ select: { slug: true, name: true } })
  const bySlug = new Map<string, string>()
  for (const city of cities) {
    bySlug.set(city.slug, city.name)
  }

  const venueTowns = await prisma.venue.groupBy({
    by: ['town'],
    where: { is_live: '1' },
  })

  for (const row of venueTowns) {
    const name = cleanDbString(row.town)
    if (!name) continue
    const slug = slugifyPlace(name)
    if (!slug || bySlug.has(slug)) continue
    bySlug.set(slug, name)
  }

  return [...bySlug.entries()].map(([slug, name]) => ({
    slug,
    name,
    displayName: formatPlaceName(name),
  }))
}

export async function listCountySlugs(): Promise<
  Array<{ slug: string; name: string; displayName: string; venueCount: number }>
> {
  const rows = await prisma.venue.groupBy({
    by: ['county'],
    where: { is_live: '1' },
    _count: { _all: true },
  })

  const bySlug = new Map<
    string,
    { name: string; displayName: string; venueCount: number }
  >()

  for (const row of rows) {
    const raw = cleanDbString(row.county)
    if (!raw || !isKnownUkCounty(raw)) continue

    const canonical = canonicalUkCountyName(raw)!
    const key = countyLookupKey(canonical)!
    const slug = canonicalCountySlug(canonical)!
    const count = Number(row._count?._all ?? 0)

    const existing = bySlug.get(slug)
    if (existing) {
      existing.venueCount += count
    } else {
      bySlug.set(slug, {
        name: canonical,
        displayName: formatPlaceName(canonical),
        venueCount: count,
      })
    }
  }

  return [...bySlug.entries()].map(([slug, data]) => ({
    slug,
    ...data,
  }))
}
