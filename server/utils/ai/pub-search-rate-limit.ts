import type { H3Event } from 'h3'
import { tryAuth } from '../require-auth'
import { prisma } from '../prisma'
import { AI_ANON_DAILY_LIMIT, AI_AUTH_DAILY_LIMIT } from '../../../utils/ai-pub-search'

const VISITOR_COOKIE = 'ukpubs_ai_vid'
const QUOTA_COOKIE = 'ukpubs_ai_search_quota'

function utcDayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function readQuotaCookie(event: H3Event) {
  const raw = getCookie(event, QUOTA_COOKIE) || ''
  const [day, countRaw] = raw.split(':')
  const count = Number.parseInt(countRaw || '0', 10)
  if (day !== utcDayStamp() || !Number.isFinite(count)) {
    return { day: utcDayStamp(), count: 0 }
  }
  return { day, count }
}

function writeQuotaCookie(event: H3Event, count: number) {
  setCookie(event, QUOTA_COOKIE, `${utcDayStamp()}:${count}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export async function getAiSearchVisitorId(event: H3Event) {
  const existing = getCookie(event, VISITOR_COOKIE)
  if (existing && existing.length >= 8 && existing.length <= 80) return existing
  const id = crypto.randomUUID()
  setCookie(event, VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return id
}

export async function enforceAiSearchRateLimit(event: H3Event) {
  const user = await tryAuth(event)
  const visitorId = await getAiSearchVisitorId(event)
  const dailyLimit = user ? AI_AUTH_DAILY_LIMIT : AI_ANON_DAILY_LIMIT
  const cookieQuota = readQuotaCookie(event)

  let used = cookieQuota.count
  try {
    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)
    const where = user
      ? { userId: user.id, createdAt: { gte: since }, status: { in: ['ok', 'empty'] } }
      : { visitorId, createdAt: { gte: since }, status: { in: ['ok', 'empty'] } }
    used = await prisma.aiPubSearch.count({ where })
  } catch {
    used = cookieQuota.count
  }

  const remaining = Math.max(0, dailyLimit - used)
  if (remaining <= 0) {
    writeQuotaCookie(event, dailyLimit)
    throw createError({
      statusCode: 429,
      statusMessage: `Daily AI search limit reached (${dailyLimit} per day). Try again tomorrow, or sign in for a higher limit.`,
    })
  }

  return {
    user,
    visitorId,
    dailyLimit,
    remaining,
    used,
    consume: () => {
      writeQuotaCookie(event, Math.min(dailyLimit, used + 1))
    },
  }
}

export function remainingAfterConsume(used: number, dailyLimit: number) {
  return Math.max(0, dailyLimit - used - 1)
}
