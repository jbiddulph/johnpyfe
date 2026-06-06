import { prisma } from '../../utils/prisma'
import { getAnalyticsReports, type AnalyticsPeriod } from '../../utils/analytics'
import { requireAdmin } from '../../utils/require-admin'

const PERIODS = new Set<AnalyticsPeriod>(['7d', '30d', '90d', 'all'])

/** Admin-only performance reports for venues, events and pages. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const periodRaw = String(query.period || '30d')
  const period: AnalyticsPeriod = PERIODS.has(periodRaw as AnalyticsPeriod)
    ? (periodRaw as AnalyticsPeriod)
    : '30d'

  try {
    return await getAnalyticsReports(prisma, period)
  } catch (error) {
    console.error('[api/admin/reports] failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load reports' })
  }
})
