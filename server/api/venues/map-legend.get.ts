import { getMapPoints } from '../../utils/map-points'

/** Venue type legend for /api/venues/map (`point.t` indexes `types`). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

  try {
    const { types, points, generatedAt } = await getMapPoints()
    return { types, total: points.length, generatedAt }
  } catch (error) {
    console.error('[api/venues/map-legend] failed:', error)
    throw createError({
      statusCode: 503,
      statusMessage: 'Venue map data temporarily unavailable',
    })
  }
})
