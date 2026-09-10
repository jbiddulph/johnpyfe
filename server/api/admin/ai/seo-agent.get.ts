import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'
import { countSeoRecommendationsToday, countVenuesNeedingSeoImprovement, expireStaleSeoRuns, parseSeoAgentDailyLimit, SEO_AGENT_CHUNK_LIMIT, SEO_AGENT_CRON, SEO_AGENT_CRON_UK_SUMMER, SEO_AGENT_CRON_UK_WINTER, SEO_AGENT_CRON_UTC_HOURS, isSeoCronEnabled } from '../../../utils/ai/seo-agent'

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

  const dailyLimit = parseSeoAgentDailyLimit()
  const concurrency = Math.min(
    Math.max(1, Number.parseInt(process.env.AI_SEO_BATCH_CONCURRENCY || '1', 10) || 2),
    5,
  )
  const live = String(getQuery(event).live || '') === '1'

  if (live) {
    try {
      await expireStaleSeoRuns()
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
    await expireStaleSeoRuns()
    const [
      totalRuns,
      completedRuns,
      failedRuns,
      recentRuns,
      pendingRecommendations,
      appliedRecommendations,
      latestRecommendation,
      remainingListings,
      processedToday,
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
      countSeoRecommendationsToday(),
    ])

    return {
      schedule: {
        cron: SEO_AGENT_CRON,
        cronEnabled: isSeoCronEnabled(),
        utcTime: SEO_AGENT_CRON_UTC_HOURS,
        ukSummerTime: SEO_AGENT_CRON_UK_SUMMER,
        ukWinterTime: SEO_AGENT_CRON_UK_WINTER,
        dailyLimit,
        listingsPerWorker: SEO_AGENT_CHUNK_LIMIT,
        hourlyJobs: 5,
        workerMinutes: 15,
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
        processedToday,
        remainingToday: Math.max(0, dailyLimit - processedToday),
        latestRecommendationAt: latestRecommendation?.generatedAt || null,
      },
      recentRuns,
      migrationReady: true,
    }
  } catch (error) {
    if (!isMissingSeoTableError(error)) throw error

    return {
      schedule: {
        cron: SEO_AGENT_CRON,
        cronEnabled: isSeoCronEnabled(),
        utcTime: SEO_AGENT_CRON_UTC_HOURS,
        ukSummerTime: SEO_AGENT_CRON_UK_SUMMER,
        ukWinterTime: SEO_AGENT_CRON_UK_WINTER,
        dailyLimit,
        listingsPerWorker: SEO_AGENT_CHUNK_LIMIT,
        hourlyJobs: 5,
        workerMinutes: 15,
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
        processedToday: 0,
        remainingToday: dailyLimit,
        latestRecommendationAt: null,
      },
      recentRuns: [],
      migrationReady: false,
    }
  }
})
