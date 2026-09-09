import { prisma } from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/require-auth'
import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { getPendingSeoImprovementCount } from '../../../../utils/ai/seo-agent'

export default defineEventHandler(async (event) => {
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  const user = await requireAuth(event)
  await requireVerifiedClaimAccess(user.id, venueId)

  const improvementCount = await getPendingSeoImprovementCount(venueId)
  const latestRecommendation = await prisma.venueSeoRecommendation.findFirst({
    where: { venueId, status: 'pending' },
    orderBy: { generatedAt: 'desc' },
  })

  return {
    venueId,
    improvementCount,
    label: `${improvementCount} SEO improvement${improvementCount === 1 ? '' : 's'} available`,
    latestRecommendation,
  }
})
