import { prisma } from '../../utils/prisma'

let cached: any | null = null
let cacheExpiresAt = 0
const CACHE_MS = 5 * 60 * 1000

/** Get featured news article (cached 5 minutes). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  if (cached && Date.now() < cacheExpiresAt) {
    return cached
  }

  try {
    const featuredNews = await prisma.ukpubsNews.findFirst({
      where: {
        isFeatured: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        authorName: true,
        publishedAt: true,
      },
    })

    cached = featuredNews
    cacheExpiresAt = Date.now() + CACHE_MS
    return cached
  } catch (error) {
    console.error('[api/news/featured] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load featured news',
    })
  }
})
