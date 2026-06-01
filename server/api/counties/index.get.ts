import { listCountySlugs } from '../../utils/place-hub'

/** All county hub pages (derived from live venues). */
export default defineEventHandler(async () => {
  const counties = await listCountySlugs()
  return counties
    .map((c) => ({
      ...c,
      href: `/county/${c.slug}`,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
})
