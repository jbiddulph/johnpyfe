import { prisma } from '../../utils/prisma'
import { cleanDbString } from '../../../utils/format-venue'

/** Distinct town names for venue list filters. */
export default defineEventHandler(async () => {
  const rows = await prisma.venue.findMany({
    where: { is_live: '1' },
    select: { town: true },
    distinct: ['town'],
    orderBy: { town: 'asc' },
  })

  return rows
    .map((row) => cleanDbString(row.town))
    .filter((name): name is string => Boolean(name))
})
