import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import { serializeCrawl, stopInclude } from '../../utils/crawls'
import { ensureUkpubsProfile } from '../../utils/crawl-profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await ensureUkpubsProfile(user)
  const method = event.method

  if (method === 'GET') {
    const [owned, memberships] = await Promise.all([
      prisma.ukpubsCrawl.findMany({
        where: { userId: user.id },
        include: {
          stops: { orderBy: { sortOrder: 'asc' }, include: stopInclude },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.ukpubsCrawlMember.findMany({
        where: { userId: user.id, status: 'accepted' },
        include: {
          crawl: {
            include: {
              stops: { orderBy: { sortOrder: 'asc' }, include: stopInclude },
            },
          },
        },
      }),
    ])

    const ownedDtos = owned.map((c) => serializeCrawl(c, { canEdit: true, role: 'owner' }))
    const sharedDtos = memberships
      .map((m) => m.crawl)
      .filter(Boolean)
      .map((c) => serializeCrawl(c, { canEdit: false, role: 'member' }))

    return [...ownedDtos, ...sharedDtos]
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
        stops: { orderBy: { sortOrder: 'asc' }, include: stopInclude },
      },
    })

    return serializeCrawl(crawl, { canEdit: true, role: 'owner' })
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
