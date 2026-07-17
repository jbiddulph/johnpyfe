import type { User } from '@supabase/supabase-js'
import { prisma } from './prisma'

function slugifyUsername(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24)
}

export function displayNameFromUser(user: User) {
  const metadata = user.user_metadata as { name?: string; full_name?: string } | undefined
  return String(metadata?.name || metadata?.full_name || user.email?.split('@')[0] || 'User').trim()
}

export async function ensureUkpubsProfile(user: User) {
  const displayName = displayNameFromUser(user)
  const existing = await prisma.ukpubsProfile.findUnique({ where: { userId: user.id } })
  if (existing) {
    const expectedBase = slugifyUsername(displayName || user.email?.split('@')[0] || 'user') || 'user'
    const usernameLooksCorrect =
      existing.username === expectedBase
      || new RegExp(`^${expectedBase}\\d+$`).test(existing.username)
      || existing.username.startsWith('user_')

    const data: { displayName?: string; username?: string } = {}
    if (displayName && displayName !== existing.displayName) {
      data.displayName = displayName
    }

    // Repair usernames created by the old SQL bug that stripped capitals
    if (!usernameLooksCorrect) {
      let nextUsername = expectedBase.length >= 3 ? expectedBase : `${expectedBase}user`
      for (let i = 0; i < 20; i++) {
        const candidate = i === 0 ? nextUsername : `${nextUsername.slice(0, 20)}${i + 1}`
        const clash = await prisma.ukpubsProfile.findUnique({ where: { username: candidate } })
        if (!clash || clash.userId === user.id) {
          data.username = candidate
          break
        }
      }
    }

    if (Object.keys(data).length) {
      return prisma.ukpubsProfile.update({
        where: { userId: user.id },
        data,
      })
    }
    return existing
  }

  const base = slugifyUsername(displayName || user.email?.split('@')[0] || 'user') || 'user'
  let username = base.length >= 3 ? base : `${base}user`
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? username : `${username.slice(0, 20)}${i + 1}`
    const clash = await prisma.ukpubsProfile.findUnique({ where: { username: candidate } })
    if (!clash) {
      return prisma.ukpubsProfile.create({
        data: {
          userId: user.id,
          username: candidate,
          displayName,
        },
      })
    }
  }

  const fallback = `user_${user.id.replace(/-/g, '').slice(0, 12)}`
  return prisma.ukpubsProfile.create({
    data: {
      userId: user.id,
      username: fallback,
      displayName,
    },
  })
}

export async function searchUkpubsProfiles(query: string, excludeUserId: string, limit = 8) {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []

  return prisma.ukpubsProfile.findMany({
    where: {
      userId: { not: excludeUserId },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      userId: true,
      username: true,
      displayName: true,
    },
    orderBy: { username: 'asc' },
    take: limit,
  })
}

export async function getProfilesByUserIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, { userId: string; username: string; displayName: string }>()
  const rows = await prisma.ukpubsProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, username: true, displayName: true },
  })
  return new Map(rows.map((row) => [row.userId, row]))
}
