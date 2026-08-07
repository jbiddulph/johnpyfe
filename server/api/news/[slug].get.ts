import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required',
    })
  }

  try {
    const article = await prisma.ukpubsNews.findUnique({
      where: {
        slug,
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

    if (!article) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Article not found',
      })
    }

    return article
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('[api/news/[slug]] failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load article',
    })
  }
})
