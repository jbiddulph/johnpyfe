import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/require-auth'
import {
  getCrawlForUser,
  parseOptionalCoord,
  serializeCrawl,
  serializeStop,
  stopInclude,
} from '../../../utils/crawls'

type IncomingStop = {
  id?: string
  venueId?: number | null
  venueName?: string
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const crawlId = getRouterParam(event, 'id')
  if (!crawlId) {
    throw createError({ statusCode: 400, statusMessage: 'Crawl id is required' })
  }

  const method = event.method

  if (method === 'POST') {
    const crawl = await getCrawlForUser(crawlId, user.id)
    const body = await readBody(event)
    const stop = await resolveStopInput(body)

    if (!stop.venueId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Select a pub from search results (venueId is required)',
      })
    }

    const created = await prisma.ukpubsCrawlStop.create({
      data: {
        crawlId,
        venueId: stop.venueId,
        venueName: stop.venueName,
        latitude: stop.latitude,
        longitude: stop.longitude,
        notes: stop.notes,
        sortOrder: crawl.stops.length,
      },
      include: stopInclude,
    })

    return serializeStop(created)
  }

  if (method === 'PUT') {
    await getCrawlForUser(crawlId, user.id)
    const body = await readBody(event)
    const stopsInput = Array.isArray(body?.stops) ? (body.stops as IncomingStop[]) : null
    if (!stopsInput) {
      throw createError({ statusCode: 400, statusMessage: 'stops array is required' })
    }

    const resolved = await Promise.all(stopsInput.map((item) => resolveStopInput(item)))

    await prisma.$transaction(async (tx) => {
      await tx.ukpubsCrawlStop.deleteMany({ where: { crawlId } })

      if (resolved.length) {
        await tx.ukpubsCrawlStop.createMany({
          data: resolved.map((stop, index) => ({
            id: crypto.randomUUID(),
            crawlId,
            venueId: stop.venueId,
            venueName: stop.venueName,
            latitude: stop.latitude,
            longitude: stop.longitude,
            notes: stop.notes,
            sortOrder: index,
          })),
        })
      }

      const currentStopIndex = Number.isFinite(Number(body?.currentStopIndex))
        ? Math.max(0, Math.min(Number(body.currentStopIndex), Math.max(0, resolved.length - 1)))
        : 0

      await tx.ukpubsCrawl.update({
        where: { id: crawlId },
        data: {
          ...(body?.name != null ? { name: String(body.name).trim() || undefined } : {}),
          currentStopIndex: resolved.length === 0 ? 0 : currentStopIndex,
        },
      })
    })

    const crawl = await getCrawlForUser(crawlId, user.id)
    return serializeCrawl(crawl)
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})

async function resolveStopInput(input: IncomingStop | null | undefined) {
  const venueId = parseOptionalVenueId(input?.venueId)

  let venueName = String(input?.venueName || '').trim()
  let latitude = parseOptionalCoord(input?.latitude)
  let longitude = parseOptionalCoord(input?.longitude)
  const notes = input?.notes == null ? null : String(input.notes).trim() || null

  if (venueId != null) {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        venuename: true,
        latitude: true,
        longitude: true,
      },
    })
    if (!venue) {
      throw createError({ statusCode: 404, statusMessage: `Venue ${venueId} not found` })
    }
    if (!venueName) venueName = venue.venuename
    if (latitude == null) latitude = parseOptionalCoord(venue.latitude)
    if (longitude == null) longitude = parseOptionalCoord(venue.longitude)

    return {
      venueId: venue.id,
      venueName,
      latitude,
      longitude,
      notes,
    }
  }

  if (!venueName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Each stop needs a venueId or venueName',
    })
  }

  return {
    venueId: null,
    venueName,
    latitude,
    longitude,
    notes,
  }
}

function parseOptionalVenueId(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number.parseInt(String(value), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
