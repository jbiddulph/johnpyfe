import { prisma } from '../../../../utils/prisma'
import { requireAuth } from '../../../../utils/require-auth'
import { createNotification } from '../../../../utils/crawl-notifications'
import { ensureUkpubsProfile, getProfilesByUserIds } from '../../../../utils/crawl-profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const memberId = getRouterParam(event, 'memberId')
  if (!memberId) {
    throw createError({ statusCode: 400, statusMessage: 'Invitation id is required' })
  }

  const action = String(getRouterParam(event, 'action') || '').toLowerCase()
  if (!['accept', 'decline'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Action must be accept or decline' })
  }

  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const membership = await prisma.ukpubsCrawlMember.findUnique({
    where: { id: memberId },
    include: {
      crawl: { select: { id: true, name: true, userId: true } },
    },
  })
  if (!membership || membership.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }
  if (membership.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Invitation already responded to' })
  }

  const profile = await ensureUkpubsProfile(user)
  const status = action === 'accept' ? 'accepted' : 'declined'

  await prisma.ukpubsCrawlMember.update({
    where: { id: memberId },
    data: {
      status,
      respondedAt: new Date(),
    },
  })

  if (action === 'accept') {
    await createNotification({
      userId: membership.crawl.userId,
      type: 'crawl_invite_accepted',
      title: `${profile.username} joined your pub crawl`,
      body: `${profile.displayName} accepted the invite to “${membership.crawl.name}”.`,
      link: '/pub-crawls',
      crawlId: membership.crawl.id,
    })
  }

  const profiles = await getProfilesByUserIds([membership.crawl.userId])
  const owner = profiles.get(membership.crawl.userId)

  return {
    ok: true,
    status,
    crawl: {
      id: membership.crawl.id,
      name: membership.crawl.name,
      ownerUsername: owner?.username || null,
    },
  }
})
