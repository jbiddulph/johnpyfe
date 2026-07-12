import { prisma } from '../../utils/prisma'
import { getHomepageStats } from '../../utils/homepage-stats'

let cached: Awaited<ReturnType<typeof getHomepageStats>> | null = null
let cacheExpiresAt = 0
/** Keep short so stadium/county photo_url edits show up without a long wait. */
const CACHE_MS = 5 * 60 * 1000
/** Bump when homepage aggregation logic changes (invalidates in-memory cache). */
const CACHE_VERSION = 7
let cacheVersion = 0

/** Aggregated homepage discovery lists (cached 5 minutes). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

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
