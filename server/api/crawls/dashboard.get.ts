import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/require-auth'
import { ensureUkpubsProfile, getProfilesByUserIds } from '../../utils/crawl-profiles'
import { isCrawlCompleted, serializeCrawl, stopInclude } from '../../utils/crawls'
import { serializeNotification } from '../../utils/crawl-notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const profile = await ensureUkpubsProfile(user)

  const [owned, memberships, pendingInvites, notifications] = await Promise.all([
    prisma.ukpubsCrawl.findMany({
      where: { userId: user.id },
      include: {
        stops: { orderBy: { sortOrder: 'asc' }, include: stopInclude },
        members: {
          where: { status: { in: ['pending', 'accepted'] } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.ukpubsCrawlMember.findMany({
      where: { userId: user.id, status: 'accepted' },
      include: {
        crawl: {
          include: {
            stops: { orderBy: { sortOrder: 'asc' }, include: stopInclude },
            members: {
              where: { status: { in: ['pending', 'accepted'] } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ukpubsCrawlMember.findMany({
      where: { userId: user.id, status: 'pending' },
      include: {
        crawl: {
          select: {
            id: true,
            name: true,
            userId: true,
            updatedAt: true,
            _count: { select: { stops: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ukpubsNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  const sharedCrawls = memberships
    .map((m) => m.crawl)
    .filter(Boolean)

  const allMemberUserIds = new Set<string>()
  for (const crawl of [...owned, ...sharedCrawls]) {
    allMemberUserIds.add(crawl.userId)
    for (const member of crawl.members || []) {
      allMemberUserIds.add(member.userId)
      allMemberUserIds.add(member.invitedBy)
    }
  }
  for (const invite of pendingInvites) {
    allMemberUserIds.add(invite.invitedBy)
    allMemberUserIds.add(invite.crawl.userId)
  }

  const profiles = await getProfilesByUserIds([...allMemberUserIds])

  function memberDtos(crawl: typeof owned[number]) {
    const ownerProfile = profiles.get(crawl.userId)
    const rows = [
      {
        userId: crawl.userId,
        username: ownerProfile?.username || 'owner',
        displayName: ownerProfile?.displayName || 'Owner',
        status: 'accepted' as const,
        role: 'owner' as const,
      },
      ...(crawl.members || []).map((member) => {
        const p = profiles.get(member.userId)
        return {
          id: member.id,
          userId: member.userId,
          username: p?.username || 'user',
          displayName: p?.displayName || 'User',
          status: member.status as 'pending' | 'accepted' | 'declined',
          role: 'member' as const,
          invitedBy: member.invitedBy,
        }
      }),
    ]
    return rows
  }

  function withMeta(
    crawl: typeof owned[number],
    role: 'owner' | 'member',
    extras?: {
      invitedByUserId?: string | null
    },
  ) {
    const dto = serializeCrawl(crawl, { canEdit: role === 'owner', role })
    const ownerProfile = profiles.get(crawl.userId)
    const inviterId = extras?.invitedByUserId || null
    const inviterProfile = inviterId ? profiles.get(inviterId) : null
    return {
      ...dto,
      members: memberDtos(crawl),
      acceptedMemberCount: (crawl.members || []).filter((m) => m.status === 'accepted').length,
      owner: {
        userId: crawl.userId,
        username: ownerProfile?.username || 'owner',
        displayName: ownerProfile?.displayName || 'Owner',
      },
      invitedBy: inviterProfile
        ? {
            userId: inviterId!,
            username: inviterProfile.username,
            displayName: inviterProfile.displayName,
          }
        : role === 'member'
          ? {
              userId: crawl.userId,
              username: ownerProfile?.username || 'owner',
              displayName: ownerProfile?.displayName || 'Owner',
            }
          : null,
    }
  }

  const ownedDtos = owned.map((c) => withMeta(c, 'owner'))
  const sharedDtos = memberships.map((m) =>
    withMeta(m.crawl, 'member', { invitedByUserId: m.invitedBy }),
  )

  const activeOwned = ownedDtos.find((c) => !isCrawlCompleted(c))
  const activeShared = sharedDtos.find((c) => !isCrawlCompleted(c))
  // Prefer a shared (invited) crawl when the user has no owned incomplete crawl
  const activeCrawl = activeOwned || activeShared || null

  // Sort shared crawls ahead of owned completed ones in "other" for invitees
  const completedCrawls = [...ownedDtos, ...sharedDtos].filter((c) => isCrawlCompleted(c))
  const otherCrawls = [...sharedDtos, ...ownedDtos].filter((c) => {
    if (activeCrawl && c.id === activeCrawl.id) return false
    if (isCrawlCompleted(c)) return false
    return true
  })

  return {
    profile: {
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
    },
    activeCrawl,
    completedCrawls,
    otherCrawls,
    pendingInvites: pendingInvites.map((invite) => {
      const inviter = profiles.get(invite.invitedBy)
      const owner = profiles.get(invite.crawl.userId)
      return {
        id: invite.id,
        crawlId: invite.crawlId,
        crawlName: invite.crawl.name,
        stopCount: invite.crawl._count.stops,
        invitedBy: {
          userId: invite.invitedBy,
          username: inviter?.username || owner?.username || 'user',
          displayName: inviter?.displayName || owner?.displayName || 'User',
        },
        createdAt: invite.createdAt.toISOString(),
      }
    }),
    notifications: notifications.map(serializeNotification),
    unreadNotificationCount: notifications.filter((n) => !n.readAt).length,
  }
})
