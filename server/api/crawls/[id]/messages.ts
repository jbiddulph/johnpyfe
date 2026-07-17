import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/require-auth'
import { getCrawlAccess } from '../../../utils/crawls'
import { ensureUkpubsProfile, getProfilesByUserIds } from '../../../utils/crawl-profiles'

const MAX_BODY_LENGTH = 2000
const DEFAULT_LIMIT = 100

function serializeMessage(
  row: { id: string; crawlId: string; userId: string; body: string; createdAt: Date },
  profile?: { username: string; displayName: string } | null,
) {
  return {
    id: row.id,
    crawlId: row.crawlId,
    userId: row.userId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    username: profile?.username || 'user',
    displayName: profile?.displayName || 'User',
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const crawlId = getRouterParam(event, 'id')
  if (!crawlId) {
    throw createError({ statusCode: 400, statusMessage: 'Crawl id is required' })
  }

  // Owner or accepted member only (pending invitees cannot chat yet)
  await getCrawlAccess(crawlId, user.id)
  await ensureUkpubsProfile(user)

  if (event.method === 'GET') {
    const query = getQuery(event)
    const after = typeof query.after === 'string' && query.after ? query.after : null
    const limitRaw = Number(query.limit)
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.floor(limitRaw), 1), 200)
      : DEFAULT_LIMIT

    const rows = await prisma.ukpubsCrawlMessage.findMany({
      where: {
        crawlId,
        ...(after
          ? {
              createdAt: {
                gt: new Date(after),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })

    const profiles = await getProfilesByUserIds([...new Set(rows.map((r) => r.userId))])
    return {
      messages: rows.map((row) => serializeMessage(row, profiles.get(row.userId))),
    }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const text = String(body?.body || '').trim()
    if (!text) {
      throw createError({ statusCode: 400, statusMessage: 'Message cannot be empty' })
    }
    if (text.length > MAX_BODY_LENGTH) {
      throw createError({
        statusCode: 400,
        statusMessage: `Message must be ${MAX_BODY_LENGTH} characters or fewer`,
      })
    }

    const created = await prisma.ukpubsCrawlMessage.create({
      data: {
        crawlId,
        userId: user.id,
        body: text,
      },
    })

    const profile = await ensureUkpubsProfile(user)
    return serializeMessage(created, profile)
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
