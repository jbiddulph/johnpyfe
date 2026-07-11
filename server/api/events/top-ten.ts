import { prisma } from '../../utils/prisma'
import { getEventsTopTen } from '../../utils/events-top-ten'

let cached: Awaited<ReturnType<typeof getEventsTopTen>> | null = null
let cacheExpiresAt = 0
const CACHE_MS = 15 * 60 * 1000
const CACHE_VERSION = 2
let cacheVersion = 0

/** Top venues and towns by upcoming event count (cached 15 minutes). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')

  if (cached && cacheVersion === CACHE_VERSION && Date.now() < cacheExpiresAt) {
    return cached
  }

  try {
    cached = await getEventsTopTen(prisma)
    cacheVersion = CACHE_VERSION
    cacheExpiresAt = Date.now() + CACHE_MS
    return cached
  } catch (error) {
    console.error('[api/events/top-ten] failed:', error)
    return { limitedVenues: [], limitedTowns: [] }
  }
})
