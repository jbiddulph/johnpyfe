import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import { serializeNotification } from '../../utils/crawl-notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (event.method === 'GET') {
    const rows = await prisma.ukpubsNotification.findMany({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })
    return {
      notifications: rows.map(serializeNotification),
      unreadCount: rows.length,
    }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    if (body?.markAllRead) {
      await prisma.ukpubsNotification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      })
      return { ok: true }
    }

    const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []
    if (!ids.length) {
      throw createError({ statusCode: 400, statusMessage: 'ids required' })
    }
    await prisma.ukpubsNotification.updateMany({
      where: { userId: user.id, id: { in: ids } },
      data: { readAt: new Date() },
    })
    return { ok: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
