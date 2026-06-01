import { prisma } from '../../utils/prisma'
import { cleanDbString, formatPlaceName, isPlausibleTownName } from '../../../utils/format-venue'

export type TownFilterOption = {
  label: string
  value: string
}

/** Town filter options: City table names first, then validated venue town values. */
export default defineEventHandler(async (): Promise<TownFilterOption[]> => {
  const [cities, venueTownRows] = await Promise.all([
    prisma.city.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.venue.groupBy({
      by: ['town'],
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

  const byLower = new Map<string, string>()
  for (const { name } of venueTowns) {
    const key = name.toLowerCase()
    if (!byLower.has(key)) {
      byLower.set(key, name)
    }
  }

  const options: TownFilterOption[] = []
  const used = new Set<string>()

  for (const city of cities) {
    const venueValue = byLower.get(city.name.toLowerCase())
    if (!venueValue) continue
    options.push({
      label: formatPlaceName(city.name),
      value: venueValue,
    })
    used.add(venueValue.toLowerCase())
  }

  for (const { name } of venueTowns.sort((a, b) => a.name.localeCompare(b.name))) {
    const key = name.toLowerCase()
    if (used.has(key)) continue
    options.push({
      label: formatPlaceName(name),
      value: name,
    })
    used.add(key)
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
})
