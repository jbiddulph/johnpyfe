import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 50
  const skip = (page - 1) * limit

  const [articles, total] = await Promise.all([
    prisma.ukpubsNews.findMany({
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        imageUrl: true,
        authorName: true,
        isFeatured: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.ukpubsNews.count(),
  ])

  return {
    articles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})
