import { prisma } from '../../utils/prisma'
import { getHomepageStats } from '../../utils/homepage-stats'

let cached: Awaited<ReturnType<typeof getHomepageStats>> | null = null
let cacheExpiresAt = 0
const CACHE_MS = 60 * 60 * 1000
/** Bump when homepage aggregation logic changes (invalidates in-memory cache). */
const CACHE_VERSION = 6
let cacheVersion = 0

/** Aggregated homepage discovery lists (cached 1 hour). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

  if (cached && cacheVersion === CACHE_VERSION && Date.now() < cacheExpiresAt) {
    return cached
  }

  try {
    cached = await getHomepageStats(prisma)
    cacheVersion = CACHE_VERSION
    cacheExpiresAt = Date.now() + CACHE_MS
    return cached
  } catch (error) {
    console.error('[api/homepage/stats] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load homepage stats',
    })
  }
})
