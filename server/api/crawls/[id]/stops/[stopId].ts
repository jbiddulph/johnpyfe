import { prisma } from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/require-auth'
import { getCrawlForUser } from '../../../../utils/crawls'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const crawlId = getRouterParam(event, 'id')
  const stopId = getRouterParam(event, 'stopId')

  if (!crawlId || !stopId) {
    throw createError({ statusCode: 400, statusMessage: 'Crawl id and stop id are required' })
  }

  if (event.method !== 'DELETE') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const crawl = await getCrawlForUser(crawlId, user.id)
  const stop = crawl.stops.find((s) => s.id === stopId)
  if (!stop) {
    throw createError({ statusCode: 404, statusMessage: 'Stop not found' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.ukpubsCrawlStop.delete({ where: { id: stopId } })

    const remaining = crawl.stops
      .filter((s) => s.id !== stopId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sortOrder !== i) {
        await tx.ukpubsCrawlStop.update({
          where: { id: remaining[i].id },
          data: { sortOrder: i },
        })
      }
    }

    const maxIndex = Math.max(0, remaining.length - 1)
    const nextIndex = remaining.length === 0
      ? 0
      : Math.min(crawl.currentStopIndex, maxIndex)

    await tx.ukpubsCrawl.update({
      where: { id: crawlId },
      data: { currentStopIndex: nextIndex },
    })
  })

  return { ok: true }
})
