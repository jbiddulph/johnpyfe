import { prisma } from '../../utils/prisma'
import { cleanDbString, formatPlaceName, isPlausibleCountyName } from '../../../utils/format-venue'

export type CountyFilterOption = {
  label: string
  value: string
}

/** County filter options from venue county values. */
export default defineEventHandler(async (): Promise<CountyFilterOption[]> => {
  const rows = await prisma.venue.groupBy({
    by: ['county'],
    _count: { _all: true },
  })

  const byLower = new Map<string, string>()
  for (const row of rows) {
    const name = cleanDbString(row.county)
    if (!name || !isPlausibleCountyName(name)) continue
    const key = name.toLowerCase()
    if (!byLower.has(key)) {
      byLower.set(key, name)
    }
  }

  return [...byLower.values()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      label: formatPlaceName(name),
      value: name,
    }))
})
