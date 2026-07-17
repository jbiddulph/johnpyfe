import type { UkpubsCrawl, UkpubsCrawlStop } from '@prisma/client'
import { prisma } from './prisma'

export type CrawlStopDto = {
  id: string
  crawlId: string
  venueId: number | null
  venueName: string
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

export function serializeStop(stop: UkpubsCrawlStop): CrawlStopDto {
  return {
    id: stop.id,
    crawlId: stop.crawlId,
    venueId: stop.venueId,
    venueName: stop.venueName,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sortOrder: stop.sortOrder,
    notes: stop.notes,
    createdAt: stop.createdAt.toISOString(),
  }
}

export function serializeCrawl(
  crawl: UkpubsCrawl & { stops?: UkpubsCrawlStop[] },
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

export async function getCrawlForUser(crawlId: string, userId: string) {
  const crawl = await prisma.ukpubsCrawl.findFirst({
    where: { id: crawlId, userId },
    include: {
      stops: { orderBy: { sortOrder: 'asc' } },
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
