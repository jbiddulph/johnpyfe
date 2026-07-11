import { prisma } from '../../utils/prisma'
import { cleanDbString, formatPlaceName } from '../../../utils/format-venue'
import { canonicalUkCountyName, isKnownUkCounty } from '../../utils/uk-counties'

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

  const byCanonical = new Map<string, string>()
  for (const row of rows) {
    const raw = cleanDbString(row.county)
    if (!raw || !isKnownUkCounty(raw)) continue
    const canonical = canonicalUkCountyName(raw)!
    const key = canonical.toLowerCase()
    if (!byCanonical.has(key)) {
      byCanonical.set(key, canonical)
    }
  }

  return [...byCanonical.values()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      label: formatPlaceName(name),
      value: name,
    }))
})
