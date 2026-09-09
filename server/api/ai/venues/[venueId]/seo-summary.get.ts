import { prisma } from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/require-auth'
import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { getPendingSeoImprovementCount } from '../../../../utils/ai/seo-agent'

function isMissingSeoRecommendationTableError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    message.includes('venue_seo_recommendations') ||
    message.includes('VenueSeoRecommendation')
  )
}

export default defineEventHandler(async (event) => {
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  const user = await requireAuth(event)
  await requireVerifiedClaimAccess(user.id, venueId)

  let improvementCount = 0
  let latestRecommendation = null
  try {
    improvementCount = await getPendingSeoImprovementCount(venueId)
    latestRecommendation = await prisma.venueSeoRecommendation.findFirst({
      where: { venueId, status: 'pending' },
      orderBy: { generatedAt: 'desc' },
    })
  } catch (error) {
    if (!isMissingSeoRecommendationTableError(error)) throw error
    console.warn('[seo-summary] SEO recommendation table is not available yet')
  }

  return {
    venueId,
    improvementCount,
    label: `${improvementCount} SEO improvement${improvementCount === 1 ? '' : 's'} available`,
    latestRecommendation,
  }
})
