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
  createdAt: string
  updatedAt: string
  stops: CrawlStopDto[]
  stopCount: number
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
): CrawlDto {
  const stops = (crawl.stops || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeStop)

  return {
    id: crawl.id,
    userId: crawl.userId,
    name: crawl.name,
    currentStopIndex: crawl.currentStopIndex,
    createdAt: crawl.createdAt.toISOString(),
    updatedAt: crawl.updatedAt.toISOString(),
    stops,
    stopCount: stops.length,
  }
}

const stopInclude = {
  venue: {
    select: {
      id: true,
      venuename: true,
      town: true,
      county: true,
    },
  },
} as const

export async function getCrawlForUser(crawlId: string, userId: string) {
  const crawl = await prisma.ukpubsCrawl.findFirst({
    where: { id: crawlId, userId },
    include: {
      stops: {
        orderBy: { sortOrder: 'asc' },
        include: stopInclude,
      },
    },
  })
  if (!crawl) {
    throw createError({ statusCode: 404, statusMessage: 'Pub crawl not found' })
  }
  return crawl
}

export function parseOptionalCoord(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

export { stopInclude }
