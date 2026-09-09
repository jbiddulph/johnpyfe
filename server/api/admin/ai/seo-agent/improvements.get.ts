import { requireAdmin } from '../../../../utils/require-admin'
import { listSeoImprovements } from '../../../../utils/ai/seo-history'

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

  const query = getQuery(event)
  const status = String(query.status || 'applied').trim().toLowerCase()
  const runId = String(query.runId || '').trim()
  const skip = Number.parseInt(String(query.skip || '0'), 10) || 0
  const take = Number.parseInt(String(query.take || '20'), 10) || 20

  try {
    return await listSeoImprovements({
      status: status === 'all' || status === 'pending' || status === 'applied' ? status : 'applied',
      runId: runId || undefined,
      skip,
      take,
    })
  } catch (error) {
    if (!isMissingSeoTableError(error)) throw error
    return {
      items: [],
      total: 0,
      skip: Math.max(0, skip),
      take: Math.min(50, Math.max(1, take)),
      matchedBy: null,
      run: null,
      migrationReady: false,
    }
  }
})
