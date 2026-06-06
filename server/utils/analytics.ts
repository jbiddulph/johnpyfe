import type { PrismaClient } from '@prisma/client'

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all'

export type PageClassification = {
  pageType: string
  entityId: number | null
}

export type TrackAnalyticsInput = {
  eventType: 'pageview' | 'share' | 'outbound'
  path: string
  label?: string | null
  referrer?: string | null
}

const TRACKABLE_EVENT_TYPES = new Set(['pageview', 'share', 'outbound'])
const SKIP_PATH_PREFIXES = ['/admin', '/login', '/register', '/auth']

export function classifyAnalyticsPath(path: string): PageClassification {
  const normalized = normalizeAnalyticsPath(path)

  const venueMatch = normalized.match(/^\/venues\/(\d+)(?:\/|$)/)
  if (venueMatch) {
    return { pageType: 'venue', entityId: Number.parseInt(venueMatch[1], 10) || null }
  }

  const eventMatch = normalized.match(/^\/events\/(\d+)(?:\/|$)/)
  if (eventMatch) {
    return { pageType: 'event', entityId: Number.parseInt(eventMatch[1], 10) || null }
  }

  if (normalized.startsWith('/town/')) return { pageType: 'town', entityId: null }
  if (normalized.startsWith('/county/')) return { pageType: 'county', entityId: null }
  if (normalized.startsWith('/counties')) return { pageType: 'page', entityId: null }
  if (normalized.startsWith('/events')) return { pageType: 'page', entityId: null }
  if (normalized.startsWith('/venues')) return { pageType: 'page', entityId: null }
  if (normalized === '/') return { pageType: 'home', entityId: null }

  return { pageType: 'other', entityId: null }
}

export function normalizeAnalyticsPath(path: string): string {
  const base = path.split('?')[0]?.split('#')[0] || '/'
  if (!base.startsWith('/')) return `/${base}`
  return base.length > 1 ? base.replace(/\/+$/, '') : base
}

export function shouldSkipAnalyticsPath(path: string): boolean {
  const normalized = normalizeAnalyticsPath(path)
  return SKIP_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
}

export function periodStart(period: AnalyticsPeriod): Date | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export async function recordAnalyticsEvent(
  prisma: PrismaClient,
  input: TrackAnalyticsInput,
) {
  if (!TRACKABLE_EVENT_TYPES.has(input.eventType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid event type' })
  }

  const path = normalizeAnalyticsPath(input.path)
  if (!path || shouldSkipAnalyticsPath(path)) {
    return { ok: true, skipped: true }
  }

  const { pageType, entityId } = classifyAnalyticsPath(path)
  const label = input.label?.trim().slice(0, 255) || null
  const referrer = input.referrer?.trim().slice(0, 500) || null

  await prisma.analyticsEvent.create({
    data: {
      eventType: input.eventType,
      pageType,
      path,
      entityId,
      label,
      referrer,
    },
  })

  return { ok: true, skipped: false }
}

type RankedRow = {
  key: string
  pageType: string
  entityId: number | null
  path: string
  label: string | null
  pageviews: number
  shares: number
  total: number
}

function buildRankedRows(
  pageviewRows: Array<{ pageType: string; entityId: number | null; path: string; label: string | null; count: number }>,
  shareRows: Array<{ pageType: string; entityId: number | null; path: string; label: string | null; count: number }>,
): RankedRow[] {
  const byKey = new Map<string, RankedRow>()

  for (const row of pageviewRows) {
    const key = `${row.pageType}:${row.entityId ?? row.path}`
    byKey.set(key, {
      key,
      pageType: row.pageType,
      entityId: row.entityId,
      path: row.path,
      label: row.label,
      pageviews: row.count,
      shares: 0,
      total: row.count,
    })
  }

  for (const row of shareRows) {
    const key = `${row.pageType}:${row.entityId ?? row.path}`
    const existing = byKey.get(key)
    if (existing) {
      existing.shares += row.count
      existing.total += row.count
      if (!existing.label && row.label) existing.label = row.label
      continue
    }
    byKey.set(key, {
      key,
      pageType: row.pageType,
      entityId: row.entityId,
      path: row.path,
      label: row.label,
      pageviews: 0,
      shares: row.count,
      total: row.count,
    })
  }

  return [...byKey.values()].sort((a, b) => b.total - a.total || b.pageviews - a.pageviews)
}

export async function getAnalyticsReports(prisma: PrismaClient, period: AnalyticsPeriod) {
  const since = periodStart(period)
  const createdAt = since ? { gte: since } : undefined

  const whereBase = createdAt ? { createdAt } : {}

  const [pageviewCount, shareCount, pageviewGroups, shareGroups, sharePlatformGroups, dailyRows] =
    await Promise.all([
      prisma.analyticsEvent.count({ where: { ...whereBase, eventType: 'pageview' } }),
      prisma.analyticsEvent.count({ where: { ...whereBase, eventType: 'share' } }),
      prisma.analyticsEvent.groupBy({
        by: ['pageType', 'entityId', 'path', 'label'],
        where: { ...whereBase, eventType: 'pageview' },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['pageType', 'entityId', 'path', 'label'],
        where: { ...whereBase, eventType: 'share' },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['label'],
        where: { ...whereBase, eventType: 'share' },
        _count: { _all: true },
      }),
      since
        ? prisma.$queryRaw<Array<{ day: Date; pageviews: bigint; shares: bigint }>>`
            SELECT date_trunc('day', created_at) AS day,
                   COUNT(*) FILTER (WHERE event_type = 'pageview') AS pageviews,
                   COUNT(*) FILTER (WHERE event_type = 'share') AS shares
            FROM analytics_events
            WHERE created_at >= ${since}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : Promise.resolve([]),
    ])

  const pageviewRows = pageviewGroups
    .map((row) => ({
      pageType: row.pageType,
      entityId: row.entityId,
      path: row.path,
      label: row.label,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100)

  const shareRows = shareGroups
    .map((row) => ({
      pageType: row.pageType,
      entityId: row.entityId,
      path: row.path,
      label: row.label,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100)

  const ranked = buildRankedRows(pageviewRows, shareRows)

  const [venueDetails, eventDetails] = await Promise.all([
    enrichVenueRows(prisma, ranked.filter((row) => row.pageType === 'venue').slice(0, 20)),
    enrichEventRows(prisma, ranked.filter((row) => row.pageType === 'event').slice(0, 20)),
  ])

  return {
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      pageviews: pageviewCount,
      shares: shareCount,
      trackedPaths: new Set(ranked.map((row) => row.path)).size,
    },
    topVenues: venueDetails,
    topEvents: eventDetails,
    topPages: ranked
      .filter((row) => !['venue', 'event'].includes(row.pageType))
      .slice(0, 20)
      .map((row) => ({
        path: row.path,
        pageType: row.pageType,
        label: row.label,
        pageviews: row.pageviews,
        shares: row.shares,
        total: row.total,
      })),
    sharesByPlatform: sharePlatformGroups
      .filter((row) => row.label)
      .map((row) => ({
        platform: row.label,
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    dailyTrend: dailyRows.map((row) => ({
      date: row.day,
      pageviews: Number(row.pageviews),
      shares: Number(row.shares),
    })),
    notes: [
      'These stats track on-site page views and share button clicks only.',
      'For Google search rankings, impressions and SEO performance use Google Search Console.',
    ],
  }
}

async function enrichVenueRows(prisma: PrismaClient, rows: RankedRow[]) {
  const ids = rows.map((row) => row.entityId).filter((id): id is number => id != null)
  if (!ids.length) return []

  const venues = await prisma.venue.findMany({
    where: { id: { in: ids } },
    select: { id: true, venuename: true, slug: true, town: true },
  })
  const byId = new Map(venues.map((venue) => [venue.id, venue]))

  return rows
    .map((row) => {
      const venue = row.entityId != null ? byId.get(row.entityId) : null
      return {
        venueId: row.entityId,
        name: venue?.venuename || row.label || row.path,
        town: venue?.town || null,
        href: venue ? `/venues/${venue.id}/${venue.slug}` : row.path,
        pageviews: row.pageviews,
        shares: row.shares,
        total: row.total,
      }
    })
    .filter((row) => row.venueId != null)
}

async function enrichEventRows(prisma: PrismaClient, rows: RankedRow[]) {
  const ids = rows.map((row) => row.entityId).filter((id): id is number => id != null)
  if (!ids.length) return []

  const events = await prisma.event.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      event_title: true,
      listing: { select: { venuename: true } },
    },
  })
  const byId = new Map(events.map((event) => [event.id, event]))

  return rows
    .map((row) => {
      const event = row.entityId != null ? byId.get(row.entityId) : null
      return {
        eventId: row.entityId,
        title: event?.event_title || row.label || row.path,
        venueName: event?.listing?.venuename || null,
        href: row.entityId != null ? `/events/${row.entityId}` : row.path,
        pageviews: row.pageviews,
        shares: row.shares,
        total: row.total,
      }
    })
    .filter((row) => row.eventId != null)
}
