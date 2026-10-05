import { requireAdmin } from '../../../../utils/require-admin'
import { isGscConfigured, isGscPrioritiserEnabled, resolveGscSiteUrl } from '../../../../utils/ai/gsc-client'
import { getGscPriorityPreview } from '../../../../utils/ai/gsc-prioritiser'

/** Preview the GSC-ranked venues the daily SEO agent will spend OpenAI tokens on. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const limitRaw = Number(query.limit ?? 25)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25
  const forceRefresh = String(query.refresh || '') === '1'

  if (forceRefresh) {
    // Bust cache by requesting a fresh preview path that reloads opportunities.
    const { getGscPageOpportunities } = await import('../../../../utils/ai/gsc-prioritiser')
    await getGscPageOpportunities({ forceRefresh: true })
  }

  const preview = await getGscPriorityPreview(limit)

  return {
    enabled: isGscPrioritiserEnabled(),
    configured: isGscConfigured(),
    siteUrl: resolveGscSiteUrl(),
    lookbackDays: Math.min(90, Math.max(7, Number.parseInt(process.env.AI_SEO_GSC_LOOKBACK_DAYS || '28', 10) || 28)),
    minImpressions: Math.max(10, Number.parseInt(process.env.AI_SEO_GSC_MIN_IMPRESSIONS || '40', 10) || 40),
    fetchedAt: preview.fetchedAt,
    error: preview.error,
    pageOpportunityCount: preview.pageOpportunityCount,
    venueOpportunityCount: preview.venueOpportunityCount,
    opportunities: preview.venueOpportunities,
  }
})
