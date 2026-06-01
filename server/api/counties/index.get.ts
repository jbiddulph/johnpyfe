import { prisma } from '../../utils/prisma'
import { listCountySlugs } from '../../utils/place-hub'

/** All county hub pages with venue counts. */
export default defineEventHandler(async () => {
  const counties = await listCountySlugs()
  return counties
    .map((c) => ({
      ...c,
      href: `/county/${c.slug}`,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
})
