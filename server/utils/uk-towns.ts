import type { PrismaClient } from '@prisma/client'
import { cleanDbString, formatPlaceName, isPlausibleTownName, slugifyPlace } from '../../utils/format-venue'

export type UkTownOption = {
  cityId: number
  cityName: string
  citySlug: string
  /** Venue.town value used for venue list filters */
  venueTown: string
  label: string
  venueCount: number
}

type CityRow = { id: number; name: string; slug: string }

/** True when a venue.town value belongs to a UK City row. */
export function venueTownMatchesCity(
  venueTown: string,
  city: Pick<CityRow, 'name' | 'slug'>,
): boolean {
  const town = cleanDbString(venueTown)
  if (!town || !isPlausibleTownName(town)) return false

  const townLower = town.toLowerCase()
  const cityLower = city.name.toLowerCase()
  if (townLower === cityLower) return true

  const townSlug = slugifyPlace(town)
  const citySlug = slugifyPlace(city.slug) || slugifyPlace(city.name)
  if (townSlug && citySlug && townSlug === citySlug) return true
  if (townSlug && citySlug && (citySlug.startsWith(`${townSlug}-`) || citySlug.startsWith(`${townSlug}and`))) {
    return true
  }

  const cityParts = cityLower
    .split(/\s*(?:&|and)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean)

  if (cityParts.some((part) => part === townLower)) return true
  if (cityParts[0] && cityParts[0] === townLower) return true

  return false
}

/** Canonical UK town dropdown / batch-import list: City table + live venues only. */
export async function listUkTownOptions(prisma: PrismaClient): Promise<UkTownOption[]> {
  const [cities, venueTownRows] = await Promise.all([
    prisma.city.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
    prisma.venue.groupBy({
      by: ['town'],
      where: {
        is_live: '1',
        slug: { not: '' },
      },
      _count: { _all: true },
    }),
  ])

  const venueTowns = venueTownRows
    .map((row) => ({
      name: cleanDbString(row.town),
      count: row._count._all,
    }))
    .filter((row): row is { name: string; count: number } => Boolean(row.name))
    .filter((row) => isPlausibleTownName(row.name))

  const options: UkTownOption[] = []

  for (const city of cities) {
    const matches = venueTowns.filter((row) => venueTownMatchesCity(row.name, city))
    if (!matches.length) continue

    const primary = [...matches].sort((a, b) => b.count - a.count)[0]
    options.push({
      cityId: city.id,
      cityName: city.name,
      citySlug: city.slug,
      venueTown: primary.name,
      label: formatPlaceName(city.name),
      venueCount: matches.reduce((sum, row) => sum + row.count, 0),
    })
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
}
