import { prisma } from '../../utils/prisma'

/** Latest published news articles for homepage / news index (cached 5 minutes). */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  const query = getQuery(event)
  const limitRaw = Number(query.limit ?? 12)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 12

  try {
    const articles = await prisma.ukpubsNews.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        authorName: true,
        publishedAt: true,
        isFeatured: true,
      },
    })

    return { articles }
  } catch (error) {
    console.error('[api/news/latest] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load latest news',
    })
  }
})
