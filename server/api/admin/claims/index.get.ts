import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const claims = await prisma.venueClaim.findMany({
    include: {
      venue: {
        select: { id: true, venuename: true, slug: true, town: true, county: true },
      },
      organisation: {
        select: { id: true, name: true, plan: true, subscriptionStatus: true },
      },
    },
    orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
  })

  return claims
})
