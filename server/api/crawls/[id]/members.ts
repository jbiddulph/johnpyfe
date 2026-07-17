import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/require-auth'
import { getCrawlOwnedByUser } from '../../../utils/crawls'
import { createNotification } from '../../../utils/crawl-notifications'
import { ensureUkpubsProfile, getProfilesByUserIds } from '../../../utils/crawl-profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const crawlId = getRouterParam(event, 'id')
  if (!crawlId) {
    throw createError({ statusCode: 400, statusMessage: 'Crawl id is required' })
  }

  const crawl = await getCrawlOwnedByUser(crawlId, user.id)
  await ensureUkpubsProfile(user)

  if (event.method === 'GET') {
    const members = await prisma.ukpubsCrawlMember.findMany({
      where: { crawlId, status: { in: ['pending', 'accepted'] } },
      orderBy: { createdAt: 'asc' },
    })
    const profileMap = await getProfilesByUserIds([
      crawl.userId,
      ...members.map((m) => m.userId),
    ])
    const owner = profileMap.get(crawl.userId)
    return {
      members: [
        {
          userId: crawl.userId,
          username: owner?.username || 'owner',
          displayName: owner?.displayName || 'Owner',
          status: 'accepted',
          role: 'owner',
        },
        ...members.map((member) => {
          const p = profileMap.get(member.userId)
          return {
            id: member.id,
            userId: member.userId,
            username: p?.username || 'user',
            displayName: p?.displayName || 'User',
            status: member.status,
            role: 'member',
          }
        }),
      ],
    }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const username = String(body?.username || '').trim().toLowerCase()
    const inviteeUserId = String(body?.userId || '').trim()

    let invitee = null as { userId: string; username: string; displayName: string } | null
    if (inviteeUserId) {
      invitee = await prisma.ukpubsProfile.findUnique({ where: { userId: inviteeUserId } })
    } else if (username) {
      invitee = await prisma.ukpubsProfile.findUnique({ where: { username } })
    }

    if (!invitee) {
      throw createError({ statusCode: 404, statusMessage: 'User not found. They need to visit Pub Crawls once to create a username.' })
    }
    if (invitee.userId === user.id || invitee.userId === crawl.userId) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot invite yourself' })
    }

    const existing = await prisma.ukpubsCrawlMember.findUnique({
      where: {
        crawlId_userId: { crawlId, userId: invitee.userId },
      },
    })
    if (existing?.status === 'accepted') {
      throw createError({ statusCode: 409, statusMessage: 'That user is already on this crawl' })
    }
    if (existing?.status === 'pending') {
      throw createError({ statusCode: 409, statusMessage: 'Invitation already pending' })
    }

    const member = existing
      ? await prisma.ukpubsCrawlMember.update({
          where: { id: existing.id },
          data: {
            status: 'pending',
            invitedBy: user.id,
            respondedAt: null,
          },
        })
      : await prisma.ukpubsCrawlMember.create({
          data: {
            crawlId,
            userId: invitee.userId,
            invitedBy: user.id,
            status: 'pending',
          },
        })

    const inviterProfile = await ensureUkpubsProfile(user)
    await createNotification({
      userId: invitee.userId,
      type: 'crawl_invite',
      title: `${inviterProfile.username} invited you to a pub crawl`,
      body: `Join “${crawl.name}” on UK Pubs.`,
      link: '/pub-crawls',
      crawlId: crawl.id,
    })

    return {
      id: member.id,
      userId: invitee.userId,
      username: invitee.username,
      displayName: invitee.displayName,
      status: member.status,
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
