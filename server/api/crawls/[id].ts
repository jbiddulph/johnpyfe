import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import {
  getCrawlAccess,
  getCrawlOwnedByUser,
  serializeCrawl,
} from '../../utils/crawls'
import { ensureUkpubsProfile } from '../../utils/crawl-profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await ensureUkpubsProfile(user)
  const crawlId = getRouterParam(event, 'id')
  if (!crawlId) {
    throw createError({ statusCode: 400, statusMessage: 'Crawl id is required' })
  }

  const method = event.method

  if (method === 'GET') {
    const access = await getCrawlAccess(crawlId, user.id)
    return serializeCrawl(access.crawl, { canEdit: access.canEdit, role: access.role })
  }

  if (method === 'PUT' || method === 'PATCH') {
    const crawl = await getCrawlOwnedByUser(crawlId, user.id)
    const body = await readBody(event)
    const data: {
      name?: string
      currentStopIndex?: number
      completedAt?: Date | null
    } = {}

    if (body?.name != null) {
      const name = String(body.name).trim()
      if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'Crawl name cannot be empty' })
      }
      data.name = name
    }

    if (body?.currentStopIndex != null) {
      const index = Number.parseInt(String(body.currentStopIndex), 10)
      if (!Number.isFinite(index) || index < 0) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid currentStopIndex' })
      }
      const maxIndex = Math.max(0, crawl.stops.length - 1)
      data.currentStopIndex = Math.min(index, maxIndex)
    }

    if (body?.completed === true) {
      data.completedAt = new Date()
    } else if (body?.completed === false) {
      data.completedAt = null
    }

    await prisma.ukpubsCrawl.update({
      where: { id: crawlId },
      data,
    })

    const access = await getCrawlAccess(crawlId, user.id)
    return serializeCrawl(access.crawl, { canEdit: true, role: 'owner' })
  }

  if (method === 'DELETE') {
    await getCrawlOwnedByUser(crawlId, user.id)
    await prisma.ukpubsCrawl.delete({ where: { id: crawlId } })
    return { ok: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
