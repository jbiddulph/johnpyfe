import { AI_ANON_DAILY_LIMIT, AI_PUB_SEARCH_MAX_LIMIT } from '../../../utils/ai-pub-search'
import { enforceAiSearchRateLimit, remainingAfterConsume } from '../../utils/ai/pub-search-rate-limit'
import { recordAiPubSearch } from '../../utils/ai/pub-search-log'
import { runAiPubSearch } from '../../utils/ai/pub-search-openai'
import { executeCreatePubCrawl, type ToolExecutionState } from '../../utils/ai/pub-search-tools'
import { loadPubsByIds } from '../../utils/ai/pub-search-query'
import { orderPubsIntoCrawl } from '../../utils/ai/pub-search-crawl'
import { emptyAiFilters } from '../../utils/ai/pub-search-filters'

function parseCoord(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && Math.abs(n) > 0 ? n : null
}

function parseVenueIds(value: unknown) {
  if (!Array.isArray(value)) return []
  const ids = value
    .map((item) => Number.parseInt(String(item), 10))
    .filter((id) => Number.isFinite(id) && id > 0)
  return [...new Set(ids)].slice(0, AI_PUB_SEARCH_MAX_LIMIT)
}

function answerForState(question: string, state: ToolExecutionState) {
  if (state.crawl && state.pubs.length) {
    return `Here is a ${state.pubs.length}-pub crawl from UK Pubs listings. Use Save to keep it and invite friends.`
  }
  if (state.pubs.length) {
    return `Found ${state.pubs.length} matching pub${state.pubs.length === 1 ? '' : 's'} in the UK Pubs database.`
  }
  return `No matching pubs were found for “${question.slice(0, 120)}”. Try a nearby town or fewer filters.`
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const body = await readBody(event).catch(() => ({}))
  const question = String(body?.question || '').replace(/\s+/g, ' ').trim().slice(0, 400)
  const venueIds = parseVenueIds(body?.venueIds)
  const makeCrawl = body?.makeCrawl === true || body?.make_crawl === true
  const lat = parseCoord(body?.userLat ?? body?.user_lat)
  const lng = parseCoord(body?.userLng ?? body?.user_lng)
  const userLocation = lat != null && lng != null ? { lat, lng } : null

  if (!question && venueIds.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ask a question such as “pubs with gardens near Worthing”, or send at least two pub ids to order a crawl.',
    })
  }

  // Re-ordering known results is not an AI call and does not consume the daily quota.
  if (!question && venueIds.length >= 2) {
    const pubs = await loadPubsByIds(venueIds)
    if (pubs.length < 2) {
      throw createError({ statusCode: 404, statusMessage: 'Those pubs could not be found.' })
    }
    const origin = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, label: 'Your location' }
      : null
    const ordered = await orderPubsIntoCrawl(pubs, origin, pubs[0]?.town)
    return {
      answer: `Walking order for ${ordered.pubs.length} pubs, using Mapbox directions.`,
      pubs: ordered.pubs,
      crawl: ordered.crawl,
      filters: emptyAiFilters({ makeCrawl: true, limit: ordered.pubs.length }),
      remainingSearches: AI_ANON_DAILY_LIMIT,
      dailyLimit: AI_ANON_DAILY_LIMIT,
      usedAi: false,
    }
  }

  const quota = await enforceAiSearchRateLimit(event)

  try {
    const result = question
      ? await runAiPubSearch(question, userLocation, makeCrawl)
      : null

    let state = result?.state
    if (makeCrawl && state?.pubs.length && !state.crawl) {
      await executeCreatePubCrawl(
        { venueIds: state.pubs.map((pub) => pub.id), stopCount: state.pubs.length },
        userLocation,
        state,
      )
    }

    if (!state) {
      throw new Error('Search did not return a result')
    }

    const status = state.pubs.length ? 'ok' : 'empty'
    quota.consume()
    await recordAiPubSearch({
      query: question,
      userId: quota.user?.id,
      visitorId: quota.visitorId,
      status,
      filters: state.filters,
      resultCount: state.pubs.length,
    })

    return {
      answer: result?.answer || answerForState(question, state),
      pubs: state.pubs,
      crawl: state.crawl,
      filters: state.filters,
      remainingSearches: remainingAfterConsume(quota.used, quota.dailyLimit),
      dailyLimit: quota.dailyLimit,
      usedAi: Boolean(result?.usedAi),
    }
  } catch (error: any) {
    const message = error?.statusMessage || error?.message || 'AI pub search failed'
    const statusCode = Number(error?.statusCode) || 500
    await recordAiPubSearch({
      query: question,
      userId: quota.user?.id,
      visitorId: quota.visitorId,
      status: statusCode === 429 ? 'rate_limited' : 'fail',
      error: message,
      resultCount: 0,
    })
    if (statusCode === 429) throw error
    console.error('[api/ai/pub-search] failed:', error)
    throw createError({
      statusCode: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
      statusMessage: message.slice(0, 180),
    })
  }
})
