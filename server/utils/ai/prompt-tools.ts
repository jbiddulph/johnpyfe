import type { Prisma } from '@prisma/client'
import type { AiPromptLink } from '../../../types/ai-prompt'
import type { OpenAIFunctionTool } from './openai'
import { prisma } from '../prisma'
import { runSiteSearch } from '../site-search'
import { formatEventStart } from '../../../utils/format-event'
import {
  cleanDbString,
  formatPlaceName,
  parseVenueCoord,
  slugifyPlace,
} from '../../../utils/format-venue'
import { MAP_FEATURE_FLAGS, featureFlagsFromText, flagBit } from '../../../utils/map-filters'
import { findNearbyVenues, findVenuesNearPoint, venueCoordsForNearby } from '../venue-nearby'
import { getEventsTopTen } from '../events-top-ten'
import { getTopCounties, getTopTowns } from '../homepage-stats'
import { upcomingEventWhere } from '../event-list'

const AMENITY_KEYS = MAP_FEATURE_FLAGS.map((flag) => flag.key)
const MAX_TOOL_ITEMS = 8

export type PromptToolRun = {
  data: unknown
  links: AiPromptLink[]
}

function str(value: unknown, max = 120) {
  const text = cleanDbString(value) || ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function venueHref(id: number, slug: string) {
  return `/venues/${id}/${encodeURIComponent(slug || '')}`
}

function venueLink(venue: { id: number; slug: string; venuename: string; town?: string | null }): AiPromptLink {
  const town = formatPlaceName(venue.town)
  return {
    title: cleanDbString(venue.venuename) || 'Venue',
    href: venueHref(venue.id, venue.slug),
    kind: 'venue',
    meta: town || undefined,
  }
}

function compactVenue(venue: {
  id: number
  slug: string
  venuename: string
  town?: string | null
  county?: string | null
  address?: string | null
  postcode?: string | null
  venuetype?: string | null
  features?: string | null
  description?: string | null
  telephone?: string | null
  website?: string | null
  distanceMiles?: number
}) {
  return {
    id: venue.id,
    name: str(venue.venuename, 80),
    town: formatPlaceName(venue.town),
    county: formatPlaceName(venue.county),
    address: str(venue.address, 80),
    postcode: str(venue.postcode, 20),
    type: str(venue.venuetype, 40),
    features: str(venue.features, 180),
    description: str(venue.description, 220),
    telephone: str(venue.telephone, 30),
    website: str(venue.website, 80),
    href: venueHref(venue.id, venue.slug),
    ...(typeof venue.distanceMiles === 'number'
      ? { distanceMiles: Number(venue.distanceMiles.toFixed(2)) }
      : {}),
  }
}

function amenityBit(amenity: unknown): number | null {
  const key = String(amenity || '').trim().toLowerCase()
  const flag = MAP_FEATURE_FLAGS.find((item) => item.key === key)
  return flag ? flagBit(flag.bit) : null
}

function matchesAmenity(
  amenity: unknown,
  venue: { features?: string | null; venuetype?: string | null; description?: string | null },
) {
  const bit = amenityBit(amenity)
  if (bit == null) return true
  const mask =
    featureFlagsFromText(venue.features)
    | featureFlagsFromText(venue.venuetype)
    | featureFlagsFromText(venue.description)
  return Boolean(mask & bit)
}

async function searchPubs(args: Record<string, unknown>): Promise<PromptToolRun> {
  const query = str(args.query || args.q, 80)
  const town = str(args.town, 40)
  const county = str(args.county, 40)
  const amenity = str(args.amenity, 20).toLowerCase()
  const limit = num(args.limit, 6, 1, MAX_TOOL_ITEMS)

  const where: Prisma.VenueWhereInput = {
    is_live: '1',
    slug: { not: '' },
  }
  const and: Prisma.VenueWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { venuename: { contains: query, mode: 'insensitive' } },
        { town: { contains: query, mode: 'insensitive' } },
        { county: { contains: query, mode: 'insensitive' } },
        { features: { contains: query, mode: 'insensitive' } },
      ],
    })
  }
  if (town) and.push({ town: { contains: town, mode: 'insensitive' } })
  if (county) and.push({ county: { contains: county, mode: 'insensitive' } })
  if (and.length) where.AND = and

  const rows = await prisma.venue.findMany({
    where,
    select: {
      id: true,
      slug: true,
      venuename: true,
      town: true,
      county: true,
      address: true,
      postcode: true,
      venuetype: true,
      features: true,
      description: true,
      telephone: true,
      website: true,
    },
    orderBy: { venuename: 'asc' },
    take: amenity ? Math.min(limit * 5, 40) : limit,
  })

  const filtered = (amenity ? rows.filter((row) => matchesAmenity(amenity, row)) : rows).slice(0, limit)
  const items = filtered.map(compactVenue)
  return {
    data: { count: items.length, amenity: amenity || undefined, items },
    links: filtered.map(venueLink),
  }
}

async function searchPlaces(args: Record<string, unknown>): Promise<PromptToolRun> {
  const query = str(args.query || args.q, 80)
  if (query.length < 2) {
    return { data: { towns: [], counties: [] }, links: [] }
  }

  const result = await runSiteSearch(query, 0, 6)
  const links: AiPromptLink[] = [
    ...result.towns.slice(0, 6).map((town) => ({
      title: town.displayName,
      href: town.href,
      kind: 'town' as const,
      meta: `${town.venueCount} venues`,
    })),
    ...result.counties.slice(0, 6).map((county) => ({
      title: county.displayName,
      href: county.href,
      kind: 'county' as const,
      meta: `${county.venueCount} venues`,
    })),
  ]

  return {
    data: {
      towns: result.towns.slice(0, 6).map((town) => ({
        name: town.displayName,
        href: town.href,
        venueCount: town.venueCount,
      })),
      counties: result.counties.slice(0, 6).map((county) => ({
        name: county.displayName,
        href: county.href,
        venueCount: county.venueCount,
      })),
    },
    links,
  }
}

async function searchEvents(args: Record<string, unknown>): Promise<PromptToolRun> {
  const query = str(args.query || args.q, 80)
  const town = str(args.town, 40)
  const category = str(args.category, 40)
  const limit = num(args.limit, 6, 1, MAX_TOOL_ITEMS)

  const and: Prisma.EventWhereInput[] = [upcomingEventWhere()]
  if (query) {
    and.push({
      OR: [
        { event_title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { listing: { venuename: { contains: query, mode: 'insensitive' } } },
        { listing: { town: { contains: query, mode: 'insensitive' } } },
      ],
    })
  }
  if (town) {
    and.push({ listing: { town: { contains: town, mode: 'insensitive' } } })
  }
  if (category) {
    and.push({ category: { name: { contains: category, mode: 'insensitive' } } })
  }

  const rows = await prisma.event.findMany({
    where: { AND: and },
    include: {
      listing: { select: { id: true, slug: true, venuename: true, town: true } },
      category: { select: { name: true } },
      city: { select: { name: true } },
    },
    orderBy: [{ event_start: 'asc' }, { id: 'asc' }],
    take: limit,
  })

  const items = rows.map((event) => {
    const when = formatEventStart(event.event_start)
    return {
      id: event.id,
      title: str(event.event_title, 90),
      when: when.label,
      category: str(event.category?.name, 40),
      venue: str(event.listing?.venuename, 80),
      town: formatPlaceName(event.listing?.town || event.city?.name),
      href: `/events/${event.id}`,
      venueHref: event.listing ? venueHref(event.listing.id, event.listing.slug) : undefined,
    }
  })

  const links: AiPromptLink[] = items.map((item) => ({
    title: item.title,
    href: item.href,
    kind: 'event',
    meta: [item.when, item.venue, item.town].filter(Boolean).join(' · ') || undefined,
  }))

  return { data: { count: items.length, items }, links }
}

async function getVenue(args: Record<string, unknown>): Promise<PromptToolRun> {
  const venueId = Number.parseInt(String(args.venueId ?? args.id ?? ''), 10)
  if (!Number.isFinite(venueId) || venueId < 1) {
    return { data: { error: 'A numeric venueId is required' }, links: [] }
  }

  const venue = await prisma.venue.findFirst({
    where: { id: venueId, is_live: '1' },
    select: {
      id: true,
      slug: true,
      venuename: true,
      town: true,
      county: true,
      address: true,
      postcode: true,
      venuetype: true,
      features: true,
      description: true,
      telephone: true,
      website: true,
      latitude: true,
      longitude: true,
    },
  })

  if (!venue) {
    return { data: { error: 'Venue not found' }, links: [] }
  }

  return {
    data: compactVenue(venue),
    links: [venueLink(venue)],
  }
}

async function findNearbyPubs(args: Record<string, unknown>): Promise<PromptToolRun> {
  const venueId = Number.parseInt(String(args.venueId ?? ''), 10)
  const town = str(args.town, 40)
  const radiusMiles = num(args.radiusMiles, 1, 1, 5)
  const limit = num(args.limit, 6, 1, MAX_TOOL_ITEMS)

  let lat: number | null = null
  let lon: number | null = null
  let originLabel = ''
  const links: AiPromptLink[] = []

  if (Number.isFinite(venueId)) {
    const origin = await prisma.venue.findFirst({
      where: { id: venueId, is_live: '1' },
      select: { id: true, slug: true, venuename: true, town: true, latitude: true, longitude: true },
    })
    if (!origin) return { data: { error: 'Venue not found' }, links: [] }
    const coords = venueCoordsForNearby(origin)
    lat = coords?.lat ?? null
    lon = coords?.lon ?? null
    originLabel = cleanDbString(origin.venuename) || 'venue'
    links.push(venueLink(origin))
    if (lat != null && lon != null) {
      const nearby = (await findNearbyVenues(prisma, origin.id, lat, lon, radiusMiles)).slice(0, limit)
      return {
        data: {
          origin: originLabel,
          radiusMiles,
          items: nearby.map(compactVenue),
        },
        links: [...links, ...nearby.map(venueLink)],
      }
    }
  }

  if (town) {
    const sample = await prisma.venue.findMany({
      where: {
        is_live: '1',
        slug: { not: '' },
        town: { contains: town, mode: 'insensitive' },
      },
      select: { latitude: true, longitude: true, town: true },
      take: 25,
    })
    const coords = sample
      .map((row) => ({ lat: parseVenueCoord(row.latitude), lon: parseVenueCoord(row.longitude) }))
      .filter((row): row is { lat: number; lon: number } => row.lat != null && row.lon != null)
    if (coords.length) {
      lat = coords.reduce((sum, row) => sum + row.lat, 0) / coords.length
      lon = coords.reduce((sum, row) => sum + row.lon, 0) / coords.length
      originLabel = formatPlaceName(sample[0]?.town || town)
    }
  }

  if (lat == null || lon == null) {
    return { data: { error: 'Could not resolve a location. Provide a venueId or town.' }, links }
  }

  const nearby = (await findVenuesNearPoint(prisma, lat, lon, radiusMiles, limit)).slice(0, limit)
  return {
    data: {
      origin: originLabel || 'location',
      radiusMiles,
      items: nearby.map(compactVenue),
    },
    links: [...links, ...nearby.map(venueLink)],
  }
}

async function searchNews(args: Record<string, unknown>): Promise<PromptToolRun> {
  const query = str(args.query || args.q, 80)
  const limit = num(args.limit, 5, 1, MAX_TOOL_ITEMS)

  const rows = await prisma.ukpubsNews.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: { title: true, slug: true, excerpt: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  const items = rows.map((article) => ({
    title: str(article.title, 90),
    excerpt: str(article.excerpt, 180),
    href: `/news/${article.slug}`,
    publishedAt: article.publishedAt.toISOString().slice(0, 10),
  }))

  return {
    data: { count: items.length, items },
    links: items.map((item) => ({
      title: item.title,
      href: item.href,
      kind: 'news' as const,
      meta: item.publishedAt,
    })),
  }
}

async function findPubsNearStadium(args: Record<string, unknown>): Promise<PromptToolRun> {
  const query = str(args.query || args.club || args.stadium, 80)
  if (query.length < 2) {
    return { data: { error: 'Provide a club or stadium name' }, links: [] }
  }

  const stadiums = await prisma.stadium.findMany({
    where: {
      OR: [
        { club: { contains: query, mode: 'insensitive' } },
        { stadium_name: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { club: 'asc' },
    take: 5,
  })

  const stadium = stadiums[0]
  if (!stadium) {
    return { data: { error: 'No matching stadium found' }, links: [] }
  }

  const lat = Number(stadium.latitude)
  const lon = Number(stadium.longitude)
  const slug = slugifyPlace(stadium.club)
  const href = `/pubs-near-stadiums/${slug}`
  const stadiumLink: AiPromptLink = {
    title: `${stadium.club} — ${stadium.stadium_name}`,
    href,
    kind: 'stadium',
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { data: { stadium: stadiumLink.title, href, items: [] }, links: [stadiumLink] }
  }

  const nearby = (await findVenuesNearPoint(prisma, lat, lon, 1, 8)).slice(0, 8)
  return {
    data: {
      club: stadium.club,
      stadium: stadium.stadium_name,
      href,
      items: nearby.map(compactVenue),
    },
    links: [stadiumLink, ...nearby.map(venueLink)],
  }
}

async function getSiteHighlights(): Promise<PromptToolRun> {
  const [towns, counties, events, stadiums] = await Promise.all([
    getTopTowns(prisma, 6),
    getTopCounties(prisma, 6),
    getEventsTopTen(prisma, 6).catch(() => ({ limitedVenues: [], limitedTowns: [] })),
    prisma.stadium.findMany({
      orderBy: { club: 'asc' },
      take: 8,
      select: { club: true, stadium_name: true },
    }),
  ])

  const links: AiPromptLink[] = [
    ...towns.map((town) => ({
      title: town.displayName,
      href: town.href,
      kind: 'town' as const,
      meta: `${town.venueCount} venues`,
    })),
    ...counties.map((county) => ({
      title: county.displayName,
      href: county.href,
      kind: 'county' as const,
      meta: `${county.venueCount} venues`,
    })),
    ...events.limitedVenues.map((venue) => ({
      title: venue.venueName,
      href: venue.href,
      kind: 'venue' as const,
      meta: `${venue.count} upcoming events`,
    })),
    ...stadiums.map((stadium) => ({
      title: stadium.club,
      href: `/pubs-near-stadiums/${slugifyPlace(stadium.club)}`,
      kind: 'stadium' as const,
      meta: stadium.stadium_name,
    })),
    { title: 'Interactive map', href: '/map', kind: 'page' },
    { title: 'Upcoming events', href: '/events', kind: 'page' },
  ]

  return {
    data: {
      topTowns: towns.map((town) => ({ name: town.displayName, href: town.href, venueCount: town.venueCount })),
      topCounties: counties.map((county) => ({ name: county.displayName, href: county.href, venueCount: county.venueCount })),
      venuesWithEvents: events.limitedVenues.map((venue) => ({
        name: venue.venueName,
        town: venue.town,
        href: venue.href,
        eventCount: venue.count,
      })),
      stadiums: stadiums.map((stadium) => ({
        club: stadium.club,
        stadium: stadium.stadium_name,
        href: `/pubs-near-stadiums/${slugifyPlace(stadium.club)}`,
      })),
    },
    links,
  }
}

export const PROMPT_TOOL_DEFINITIONS: OpenAIFunctionTool[] = [
  {
    type: 'function',
    name: 'search_pubs',
    description:
      'Search live pub and venue listings by name, town, county, or amenity (dog-friendly, live sport, beer garden, food, etc.). Use this whenever the visitor asks for pubs or bars.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Pub or place name, or a free-text phrase' },
        town: { type: 'string', description: 'Town or city name to restrict results' },
        county: { type: 'string', description: 'UK county name to restrict results' },
        amenity: {
          type: 'string',
          enum: AMENITY_KEYS,
          description: 'Optional amenity filter from listing features',
        },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    type: 'function',
    name: 'search_places',
    description: 'Find matching town and county hub pages for a place name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Town or county name' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'search_events',
    description: 'Find upcoming pub events (gigs, quizzes, comedy, sport). Filter by town or category when known.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Event title, act, or keyword' },
        town: { type: 'string' },
        category: { type: 'string', description: 'e.g. live music, comedy, quiz' },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    type: 'function',
    name: 'get_venue',
    description: 'Load one public venue listing by its numeric id, returned from search_pubs.',
    parameters: {
      type: 'object',
      properties: {
        venueId: { type: 'integer' },
      },
      required: ['venueId'],
    },
  },
  {
    type: 'function',
    name: 'find_nearby_pubs',
    description: 'Find pubs near a known venue id or around a town centre.',
    parameters: {
      type: 'object',
      properties: {
        venueId: { type: 'integer' },
        town: { type: 'string' },
        radiusMiles: { type: 'integer', minimum: 1, maximum: 5 },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    type: 'function',
    name: 'search_news',
    description: 'Search UK pub industry news articles on the site.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    type: 'function',
    name: 'find_pubs_near_stadium',
    description: 'Find pubs within about a mile of a Premier League (or listed) stadium, by club or ground name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Club or stadium name, e.g. Anfield or Liverpool' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'get_site_highlights',
    description:
      'Get top towns, counties, venues with events, and stadium hubs. Use for “best of”, “where should I go”, or general browsing questions.',
    parameters: { type: 'object', properties: {} },
  },
]

const PRIVATE_PROMPT_TOOLS: Record<string, (args: Record<string, unknown>) => Promise<PromptToolRun>> = {
  search_pubs: searchPubs,
  search_places: searchPlaces,
  search_events: searchEvents,
  get_venue: getVenue,
  find_nearby_pubs: findNearbyPubs,
  search_news: searchNews,
  find_pubs_near_stadium: findPubsNearStadium,
  get_site_highlights: getSiteHighlights,
}

/** Private server-only dispatcher. These functions are not HTTP endpoints. */
export async function runPromptTool(name: string, args: Record<string, unknown> = {}): Promise<PromptToolRun> {
  const tool = PRIVATE_PROMPT_TOOLS[name]
  if (!tool) {
    return { data: { error: `Unknown tool: ${name}` }, links: [] }
  }
  return tool(args)
}

export function dedupePromptLinks(links: AiPromptLink[], limit = 12): AiPromptLink[] {
  const seen = new Set<string>()
  const result: AiPromptLink[] = []
  for (const link of links) {
    if (!link.href || seen.has(link.href)) continue
    seen.add(link.href)
    result.push(link)
    if (result.length >= limit) break
  }
  return result
}
