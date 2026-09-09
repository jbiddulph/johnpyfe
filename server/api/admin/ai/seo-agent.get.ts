import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'
import { countVenuesNeedingSeoImprovement } from '../../../utils/ai/seo-agent'

function isMissingSeoTableError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    message.includes('venue_seo_recommendations') ||
    message.includes('ai_seo_runs') ||
    message.includes('VenueSeoRecommendation') ||
    message.includes('AiSeoRun')
  )
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const dailyLimit = Math.min(
    Math.max(1, Number.parseInt(process.env.AI_SEO_DAILY_LIMIT || '500', 10) || 500),
    500,
  )
  const concurrency = Math.min(
    Math.max(1, Number.parseInt(process.env.AI_SEO_BATCH_CONCURRENCY || '2', 10) || 2),
    5,
  )
  const live = String(getQuery(event).live || '') === '1'

  if (live) {
    try {
      const recentRuns = await prisma.aiSeoRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      })
      return { recentRuns }
    } catch (error) {
      if (!isMissingSeoTableError(error)) throw error
      return { recentRuns: [] }
    }
  }

  try {
    const [
      totalRuns,
      completedRuns,
      failedRuns,
      recentRuns,
      pendingRecommendations,
      appliedRecommendations,
      latestRecommendation,
      remainingListings,
    ] = await Promise.all([
      prisma.aiSeoRun.count(),
      prisma.aiSeoRun.count({ where: { status: { in: ['completed', 'completed_with_errors'] } } }),
      prisma.aiSeoRun.count({ where: { status: 'failed' } }),
      prisma.aiSeoRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.venueSeoRecommendation.count({ where: { status: 'pending' } }),
      prisma.venueSeoRecommendation.count({ where: { status: 'applied' } }),
      prisma.venueSeoRecommendation.findFirst({
        orderBy: { generatedAt: 'desc' },
        select: { generatedAt: true },
      }),
      countVenuesNeedingSeoImprovement(),
    ])

    return {
      schedule: {
        cron: '0 2 * * *',
        utcTime: '02:00',
        ukSummerTime: '03:00',
        ukWinterTime: '02:00',
        dailyLimit,
        concurrency,
        webSearchEnabled: process.env.AI_SEO_ENABLE_WEB_SEARCH === 'true',
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      },
      totals: {
        totalRuns,
        completedRuns,
        failedRuns,
        pendingRecommendations,
        appliedRecommendations,
        remainingListings,
        latestRecommendationAt: latestRecommendation?.generatedAt || null,
      },
      recentRuns,
      migrationReady: true,
    }
  } catch (error) {
    if (!isMissingSeoTableError(error)) throw error

    return {
      schedule: {
        cron: '0 2 * * *',
        utcTime: '02:00',
        ukSummerTime: '03:00',
        ukWinterTime: '02:00',
        dailyLimit,
        concurrency,
        webSearchEnabled: process.env.AI_SEO_ENABLE_WEB_SEARCH === 'true',
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      },
      totals: {
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        pendingRecommendations: 0,
        appliedRecommendations: 0,
        remainingListings: 0,
        latestRecommendationAt: null,
      },
      recentRuns: [],
      migrationReady: false,
    }
  }
})
