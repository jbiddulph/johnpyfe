import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import { serializeCrawl } from '../../utils/crawls'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const method = event.method

  if (method === 'GET') {
    const crawls = await prisma.ukpubsCrawl.findMany({
      where: { userId: user.id },
      include: {
        stops: {
          orderBy: { sortOrder: 'asc' },
          include: {
            venue: {
              select: {
                id: true,
                venuename: true,
                town: true,
                county: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return crawls.map(serializeCrawl)
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const name = String(body?.name || '').trim()
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Crawl name is required' })
    }

    const crawl = await prisma.ukpubsCrawl.create({
      data: {
        userId: user.id,
        name,
        currentStopIndex: 0,
      },
      include: {
        stops: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return serializeCrawl(crawl)
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
