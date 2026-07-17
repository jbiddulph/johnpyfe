import type { UkpubsCrawl, UkpubsCrawlStop, Venue } from '@prisma/client'
import { prisma } from './prisma'

type StopWithVenue = UkpubsCrawlStop & {
  venue?: Pick<Venue, 'id' | 'venuename' | 'town' | 'county'> | null
}

export type CrawlStopDto = {
  id: string
  crawlId: string
  venueId: number | null
  venueName: string
  town: string | null
  county: string | null
  latitude: number | null
  longitude: number | null
  sortOrder: number
  notes: string | null
  createdAt: string
}

export type CrawlDto = {
  id: string
  userId: string
  name: string
  currentStopIndex: number
  startsAt: string | null
  inviteeNotes: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  stops: CrawlStopDto[]
  stopCount: number
  canEdit: boolean
  role: 'owner' | 'member' | 'none'
}

export function serializeStop(stop: StopWithVenue): CrawlStopDto {
  const town = stop.venue?.town?.trim() || null
  const county = stop.venue?.county?.trim() || null
  return {
    id: stop.id,
    crawlId: stop.crawlId,
    venueId: stop.venueId,
    venueName: stop.venueName,
    town,
    county,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sortOrder: stop.sortOrder,
    notes: stop.notes,
    createdAt: stop.createdAt.toISOString(),
  }
}

export function serializeCrawl(
  crawl: UkpubsCrawl & { stops?: StopWithVenue[] },
  options?: { canEdit?: boolean; role?: 'owner' | 'member' | 'none' },
): CrawlDto {
  const stops = (crawl.stops || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeStop)

  const isOwner = options?.role === 'owner'
  return {
    id: crawl.id,
    userId: crawl.userId,
    name: crawl.name,
    currentStopIndex: crawl.currentStopIndex,
    startsAt: crawl.startsAt?.toISOString() || null,
    inviteeNotes: crawl.inviteeNotes?.trim() || null,
    completedAt: crawl.completedAt?.toISOString() || null,
    createdAt: crawl.createdAt.toISOString(),
    updatedAt: crawl.updatedAt.toISOString(),
    stops,
    stopCount: stops.length,
    canEdit: options?.canEdit ?? isOwner,
    role: options?.role || (options?.canEdit ? 'owner' : 'none'),
  }
}

export const stopInclude = {
  venue: {
    select: {
      id: true,
      venuename: true,
      town: true,
      county: true,
    },
  },
} as const

export async function getCrawlAccess(crawlId: string, userId: string) {
  const crawl = await prisma.ukpubsCrawl.findUnique({
    where: { id: crawlId },
    include: {
      stops: {
        orderBy: { sortOrder: 'asc' },
        include: stopInclude,
      },
      members: {
        where: { userId },
        take: 1,
      },
    },
  })
  if (!crawl) {
    throw createError({ statusCode: 404, statusMessage: 'Pub crawl not found' })
  }

  if (crawl.userId === userId) {
    return { crawl, canEdit: true, role: 'owner' as const }
  }

  const membership = crawl.members[0]
  if (membership?.status === 'accepted') {
    return { crawl, canEdit: false, role: 'member' as const }
  }

  throw createError({ statusCode: 403, statusMessage: 'You do not have access to this pub crawl' })
}

/** Owner-only access (edit / delete / invite). */
export async function getCrawlOwnedByUser(crawlId: string, userId: string) {
  const access = await getCrawlAccess(crawlId, userId)
  if (!access.canEdit) {
    throw createError({ statusCode: 403, statusMessage: 'Only the crawl creator can make this change' })
  }
  return access.crawl
}

/** @deprecated use getCrawlAccess / getCrawlOwnedByUser */
export async function getCrawlForUser(crawlId: string, userId: string) {
  return getCrawlOwnedByUser(crawlId, userId)
}

export function parseOptionalCoord(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

/** Parse optional crawl start; empty/null clears. Throws 400 on invalid values. */
export function parseOptionalStartsAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const d = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(d.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid start date/time' })
  }
  return d
}

/** Parse optional invitee notes; empty clears. Max 2000 chars. */
export function parseOptionalInviteeNotes(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const notes = String(value).trim()
  if (!notes) return null
  if (notes.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Notes must be 2000 characters or fewer' })
  }
  return notes
}

export function isCrawlCompleted(crawl: { completedAt?: Date | string | null }) {
  return Boolean(crawl.completedAt)
}
