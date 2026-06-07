import { runSiteSearch, SITE_SEARCH_MIN_LENGTH, SITE_SEARCH_VENUE_PAGE_SIZE } from '../utils/site-search'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()
  const page = Math.max(1, Number.parseInt(String(query.page ?? 1), 10) || 1)
  const skip = (page - 1) * SITE_SEARCH_VENUE_PAGE_SIZE

  if (q.length < SITE_SEARCH_MIN_LENGTH) {
    return {
      query: q,
      towns: [],
      counties: [],
      venues: {
        items: [],
        total: 0,
        page: 1,
        pageSize: SITE_SEARCH_VENUE_PAGE_SIZE,
        totalPages: 1,
      },
    }
  }

  try {
    return await runSiteSearch(q, skip, SITE_SEARCH_VENUE_PAGE_SIZE)
  } catch (error) {
    console.error('[api/search] failed:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    throw createError({
      statusCode: 500,
      statusMessage: 'Search failed',
      message,
    })
  }
})
