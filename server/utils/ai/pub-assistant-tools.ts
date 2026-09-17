import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import {
  MAP_FEATURE_FLAGS,
  featureFlagsFromText,
  hasFlag,
  normaliseVenueType,
} from '../../../utils/map-filters'
import { slugifyPlace, parseVenueFeatures } from '../../../utils/format-venue'
import { findVenuesNearPoint } from '../venue-nearby'
import { upcomingEventWhere, UPCOMING_EVENT_INCLUDE, UPCOMING_EVENT_ORDER } from '../event-list'
import { getReviewSummary } from '../venue-social'
import { runSiteSearch } from '../site-search'
import type { OpenAIToolDefinition } from './openai'
import type { PubAssistantLink } from '../../../types/pub-assistant'
import {
  assistantLink,
  clampPubAssistantLimit,
  eventAssistantHref,
  newsAssistantHref,
  stadiumAssistantHref,
  truncateText,
  venueAssistantHref,
} from './pub-assistant-format'

const AMENITY_KEYS = MAP_FEATURE_FLAGS.map((flag) => flag.key) as [string, ...string[]]

const AMENITY_SEARCH_TOKENS: Record<string, string[]> = {
  garden: ['beer garden', 'outdoor', 'terrace', 'courtyard', 'al fresco'],
  dogs: ['dog'],
  music: ['live music', 'live band', 'gig', 'karaoke', 'open mic'],
  food: ['food', 'kitchen', 'sunday roast', 'restaurant'],
  sport: ['sport', 'sky sports', 'big screen', 'football'],
  ale: ['real ale', 'cask', 'craft beer', 'camra', 'brewery'],
  family: ['family', 'child', 'kids', 'play area'],
  wifi: ['wifi', 'wi-fi'],
  parking: ['parking', 'car park'],
  accessible: ['wheelchair', 'accessible', 'step-free', 'step free'],
  quiz: ['quiz'],
  rooms: ['accommodation', 'bed and breakfast', 'hotel'],
}

const liveVenueWhere: Prisma.VenueWhereInput = {
  is_live: '1',
  slug: { not: '' },
}

const venueListSelect = {
  id: true,
  slug: true,
  venuename: true,
  venuetype: true,
  address: true,
  town: true,
  county: true,
  postcode: true,
  telephone: true,
  website: true,
  features: true,
  description: true,
} as const

function stringArg(args: Record<string, unknown>, key: string): string | undefined {
  const value = String(args[key] ?? '').trim()
  return value || undefined
}

function amenityArg(args: Record<string, unknown>): string | undefined {
  const amenity = stringArg(args, 'amenity')
  if (!amenity) return undefined
  return AMENITY_KEYS.includes(amenity) ? amenity : undefined
}

function amenityWhere(amenity?: string): Prisma.VenueWhereInput | undefined {
  if (!amenity) return undefined
  const tokens = AMENITY_SEARCH_TOKENS[amenity] || [amenity]
  return {
    OR: tokens.map((token) => ({
      features: { contains: token, mode: 'insensitive' as const },
    })),
  }
}

function venueTypeWhere(venueType?: string): Prisma.VenueWhereInput | undefined {
  if (!venueType) return undefined
  return { venuetype: { contains: venueType, mode: 'insensitive' } }
}

function compactVenue(venue: {
  id: number
  slug: string
  venuename: string
  venuetype?: string | null
  address?: string | null
  town?: string | null
  county?: string | null
  postcode?: string | null
  telephone?: string | null
  website?: string | null
  features?: string | null
  description?: string | null
  distanceMiles?: number
}) {
  const href = venueAssistantHref(venue.id, venue.slug)
  const amenities = MAP_FEATURE_FLAGS
    .filter((flag) => hasFlag(featureFlagsFromText(venue.features), flag.bit))
    .map((flag) => flag.label)

  return {
    id: venue.id,
    name: venue.venuename,
    type: normaliseVenueType(venue.venuetype),
    address: venue.address || null,
    town: venue.town || null,
    county: venue.county || null,
    postcode: venue.postcode || null,
    telephone: venue.telephone || null,
    website: venue.website || null,
    amenities,
    features: parseVenueFeatures(venue.features).slice(0, 8),
    summary: truncateText(venue.description, 280),
    distanceMiles: venue.distanceMiles != null ? Number(venue.distanceMiles.toFixed(2)) : undefined,
    href,
    link: assistantLink('venue', venue.venuename, href),
  }
}

function linksFrom(items: Array<{ link?: PubAssistantLink | null }>): PubAssistantLink[] {
  return items.map((item) => item.link).filter((link): link is PubAssistantLink => Boolean(link))
}

async function searchPubs(args: Record<string, unknown>) {
  const query = stringArg(args, 'query')
  const town = stringArg(args, 'town')
  const county = stringArg(args, 'county')
  const postcode = stringArg(args, 'postcode')
  const venueType = stringArg(args, 'venueType')
  const amenity = amenityArg(args)
  const take = clampPubAssistantLimit(args.limit)

  const and: Prisma.VenueWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { venuename: { contains: query, mode: 'insensitive' } },
        { town: { contains: query, mode: 'insensitive' } },
        { county: { contains: query, mode: 'insensitive' } },
        { postcode: { contains: query, mode: 'insensitive' } },
      ],
    })
  }
  if (town) and.push({ town: { contains: town, mode: 'insensitive' } })
  if (county) and.push({ county: { contains: county, mode: 'insensitive' } })
  if (postcode) {
    and.push({
      OR: [
        { postcode: { contains: postcode, mode: 'insensitive' } },
        { postalsearch: { contains: postcode, mode: 'insensitive' } },
      ],
    })
  }
  const amenityFilter = amenityWhere(amenity)
  if (amenityFilter) and.push(amenityFilter)
  const typeFilter = venueTypeWhere(venueType)
  if (typeFilter) and.push(typeFilter)

  if (!and.length) {
    return {
      pubs: [],
      total: 0,
      notice: 'Provide a pub name, town, county, postcode, amenity, or venue type before searching.',
      links: [],
    }
  }

  const where: Prisma.VenueWhereInput = { AND: [liveVenueWhere, ...and] }
  const [rows, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      select: venueListSelect,
      orderBy: { venuename: 'asc' },
      take,
    }),
    prisma.venue.count({ where }),
  ])

  const pubs = rows.map((row) => compactVenue(row))
  return {
    query: query || null,
    town: town || null,
    county: county || null,
    amenity: amenity || null,
    venueType: venueType || null,
    total,
    pubs,
    links: linksFrom(pubs),
  }
}

async function getPub(args: Record<string, unknown>) {
  const venueId = Number.parseInt(String(args.venueId ?? ''), 10)
  if (!Number.isFinite(venueId) || venueId < 1) {
    return { error: 'A numeric venueId is required.' }
  }

  const venue = await prisma.venue.findFirst({
    where: { id: venueId, ...liveVenueWhere },
    select: {
      ...venueListSelect,
      latitude: true,
      longitude: true,
      profile: {
        select: {
          customDescription: true,
          menuFoodUrl: true,
          menuDrinksUrl: true,
        },
      },
    },
  })

  if (!venue) {
    return { found: false, message: `No live pub found for id ${venueId}.` }
  }

  const [reviews, events] = await Promise.all([
    getReviewSummary(venueId),
    prisma.event.findMany({
      where: { listingId: venueId, ...upcomingEventWhere() },
      select: {
        id: true,
        event_title: true,
        event_start: true,
        cost: true,
        category: { select: { name: true } },
      },
      orderBy: UPCOMING_EVENT_ORDER,
      take: 5,
    }),
  ])

  const packed = compactVenue({
    ...venue,
    description: venue.profile?.customDescription || venue.description,
  })
  const eventItems = events.map((event) => {
    const href = eventAssistantHref(event.id)
    return {
      id: event.id,
      title: event.event_title,
      startsAt: event.event_start.toISOString(),
      cost: event.cost || null,
      category: event.category?.name || null,
      href,
      link: assistantLink('event', event.event_title, href),
    }
  })

  return {
    found: true,
    pub: {
      ...packed,
      description: truncateText(venue.profile?.customDescription || venue.description, 700),
      menuFoodUrl: venue.profile?.menuFoodUrl || null,
      menuDrinksUrl: venue.profile?.menuDrinksUrl || null,
      rating: reviews,
      upcomingEvents: eventItems,
    },
    links: [packed.link, ...linksFrom(eventItems)].filter(Boolean),
  }
}

async function searchEvents(args: Record<string, unknown>) {
  const query = stringArg(args, 'query')
  const town = stringArg(args, 'town')
  const venueName = stringArg(args, 'venueName')
  const category = stringArg(args, 'category')
  const take = clampPubAssistantLimit(args.limit, 8, 12)

  const listingFilter: Prisma.VenueWhereInput = { is_live: '1' }
  if (town) listingFilter.town = { contains: town, mode: 'insensitive' }
  if (venueName) listingFilter.venuename = { contains: venueName, mode: 'insensitive' }

  const where: Prisma.EventWhereInput = {
    ...upcomingEventWhere(),
    listing: listingFilter,
  }

  const or: Prisma.EventWhereInput[] = []
  if (query) {
    or.push(
      { event_title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    )
  }
  if (category) {
    where.category = { name: { contains: category, mode: 'insensitive' } }
  }
  if (or.length) where.OR = or

  const rows = await prisma.event.findMany({
    where,
    include: UPCOMING_EVENT_INCLUDE,
    orderBy: UPCOMING_EVENT_ORDER,
    take,
  })

  const events = rows.map((event) => {
    const href = eventAssistantHref(event.id)
    const venueHref = event.listing ? venueAssistantHref(event.listing.id, event.listing.slug) : null
    return {
      id: event.id,
      title: event.event_title,
      startsAt: event.event_start.toISOString(),
      cost: event.cost || null,
      category: event.category?.name || null,
      summary: truncateText(event.description, 220),
      venue: event.listing?.venuename || null,
      town: event.listing?.town || event.city?.name || null,
      href,
      venueHref,
      link: assistantLink('event', event.event_title, href),
      venueLink: event.listing
        ? assistantLink('venue', event.listing.venuename, venueHref!)
        : null,
    }
  })

  return {
    query: query || null,
    town: town || null,
    category: category || null,
    events,
    links: [
      ...linksFrom(events),
      ...events.map((event) => event.venueLink).filter((link): link is PubAssistantLink => Boolean(link)),
    ],
  }
}

async function searchNews(args: Record<string, unknown>) {
  const query = stringArg(args, 'query')
  const take = clampPubAssistantLimit(args.limit, 6, 10)
  const where = query
    ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' as const } },
          { excerpt: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const articles = await prisma.ukpubsNews.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      authorName: true,
    },
  })

  const items = articles.map((article) => {
    const href = newsAssistantHref(article.slug)
    return {
      title: article.title,
      excerpt: article.excerpt,
      publishedAt: article.publishedAt.toISOString(),
      author: article.authorName,
      href,
      link: assistantLink('news', article.title, href),
    }
  })

  return { query: query || null, articles: items, links: linksFrom(items) }
}

async function searchPlaces(args: Record<string, unknown>) {
  const query = stringArg(args, 'query')
  if (!query || query.length < 2) {
    return { towns: [], counties: [], pubs: [], links: [], notice: 'Place search needs at least 2 characters.' }
  }

  const result = await runSiteSearch(query, 0, 8)
  const towns = result.towns.map((town) => ({
    name: town.displayName,
    venueCount: town.venueCount,
    href: town.href,
    link: assistantLink('town', town.displayName, town.href),
  }))
  const counties = result.counties.map((county) => ({
    name: county.displayName,
    venueCount: county.venueCount,
    href: county.href,
    link: assistantLink('county', county.displayName, county.href),
  }))
  const pubs = result.venues.items.map((venue) =>
    compactVenue({
      id: venue.id,
      slug: venue.slug,
      venuename: venue.venuename,
      address: venue.address,
      town: venue.town,
      postcode: venue.postcode,
    }),
  )

  return {
    query,
    towns,
    counties,
    pubs,
    links: [...linksFrom(towns), ...linksFrom(counties), ...linksFrom(pubs)],
  }
}

async function findNearbyPubs(args: Record<string, unknown>) {
  const latitude = typeof args.latitude === 'number' ? args.latitude : Number.parseFloat(String(args.latitude ?? ''))
  const longitude = typeof args.longitude === 'number' ? args.longitude : Number.parseFloat(String(args.longitude ?? ''))
  const radiusMiles = Math.min(10, Math.max(0.5, Number(args.radiusMiles) || 1))
  const amenity = amenityArg(args)
  const take = clampPubAssistantLimit(args.limit, 10, 12)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: 'latitude and longitude are required to find nearby pubs.' }
  }

  const nearby = await findVenuesNearPoint(prisma, latitude, longitude, radiusMiles, 24)
  if (!nearby.length) {
    return {
      latitude,
      longitude,
      radiusMiles,
      pubs: [],
      links: [],
      notice: 'No live pubs found in that radius.',
    }
  }

  const details = await prisma.venue.findMany({
    where: { id: { in: nearby.map((row) => row.id) } },
    select: venueListSelect,
  })
  const byId = new Map(details.map((row) => [row.id, row]))
  const amenityFlag = MAP_FEATURE_FLAGS.find((flag) => flag.key === amenity)

  const pubs = nearby
    .map((row) => {
      const detail = byId.get(row.id)
      if (!detail) return null
      if (amenityFlag && !hasFlag(featureFlagsFromText(detail.features), amenityFlag.bit)) return null
      return compactVenue({ ...detail, distanceMiles: row.distanceMiles })
    })
    .filter((row): row is ReturnType<typeof compactVenue> => Boolean(row))
    .slice(0, take)

  return {
    latitude,
    longitude,
    radiusMiles,
    amenity: amenity || null,
    pubs,
    links: linksFrom(pubs),
  }
}

async function findPubsNearStadium(args: Record<string, unknown>) {
  const query = stringArg(args, 'clubOrStadium')
  if (!query) {
    return { error: 'clubOrStadium is required (club or stadium name).' }
  }

  const stadiums = await prisma.stadium.findMany({
    orderBy: { club: 'asc' },
    select: {
      id: true,
      club: true,
      stadium_name: true,
      latitude: true,
      longitude: true,
    },
  })

  const needle = query.toLowerCase()
  const slug = slugifyPlace(query)
  const matches = stadiums.filter((stadium) => {
    const clubSlug = slugifyPlace(stadium.club)
    const groundSlug = slugifyPlace(stadium.stadium_name)
    return (
      clubSlug === slug
      || groundSlug === slug
      || stadium.club.toLowerCase().includes(needle)
      || stadium.stadium_name.toLowerCase().includes(needle)
    )
  })

  if (!matches.length) {
    return {
      found: false,
      notice: 'No matching stadium. Try a Premier League club or ground name.',
      stadiums: stadiums.map((stadium) => stadium.club),
      links: [],
    }
  }

  const stadium = matches[0]
  const lat = Number(stadium.latitude)
  const lon = Number(stadium.longitude)
  const radiusMiles = Math.min(3, Math.max(0.5, Number(args.radiusMiles) || 1))
  const nearby = await findNearbyPubs({
    latitude: lat,
    longitude: lon,
    radiusMiles,
    amenity: args.amenity,
    limit: args.limit,
  })

  const stadiumSlug = slugifyPlace(stadium.club)
  const href = stadiumAssistantHref(stadiumSlug)
  const stadiumLink = assistantLink('stadium', `${stadium.club} — ${stadium.stadium_name}`, href)

  return {
    found: true,
    stadium: {
      club: stadium.club,
      stadiumName: stadium.stadium_name,
      href,
    },
    otherMatches: matches.slice(1, 4).map((row) => `${row.club} (${row.stadium_name})`),
    ...nearby,
    links: [stadiumLink, ...((nearby as { links?: PubAssistantLink[] }).links || [])].filter(Boolean),
  }
}

export const PUB_ASSISTANT_TOOLS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    name: 'search_pubs',
    description:
      'Search live UK pub and venue listings by name, town, county, postcode, venue type, or amenity. Use this before recommending specific pubs.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Pub or place name search text' },
        town: { type: 'string', description: 'Town or city name, e.g. Brighton' },
        county: { type: 'string', description: 'UK county name' },
        postcode: { type: 'string', description: 'Full or partial postcode' },
        venueType: { type: 'string', description: 'Venue type such as Pub, Sports Bar, or Nightclub' },
        amenity: {
          type: 'string',
          enum: AMENITY_KEYS,
          description: 'Amenity filter from listing features',
        },
        limit: { type: 'integer', description: 'Max pubs to return (1-12)' },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'get_pub',
    description: 'Get details, amenities, review summary, and upcoming events for a specific pub by venue id from search results.',
    parameters: {
      type: 'object',
      properties: {
        venueId: { type: 'integer', description: 'Numeric venue id' },
      },
      required: ['venueId'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'search_events',
    description: 'Find upcoming pub events (gigs, quizzes, sport, comedy) by text, town, venue name, or category.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Event title or keyword' },
        town: { type: 'string' },
        venueName: { type: 'string' },
        category: { type: 'string', description: 'Event category such as Live Music or Comedy' },
        limit: { type: 'integer' },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'search_news',
    description: 'Search the latest UK pub industry news on the site.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional keyword; omit for latest stories' },
        limit: { type: 'integer' },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'search_places',
    description: 'Find town hubs, county hubs, and matching pubs for a place name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Town, city, or county name' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'find_nearby_pubs',
    description: 'Find live pubs near a latitude/longitude. Use when the visitor asks for pubs near them and coordinates are available.',
    parameters: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        radiusMiles: { type: 'number', description: 'Search radius in miles, default 1, max 10' },
        amenity: { type: 'string', enum: AMENITY_KEYS },
        limit: { type: 'integer' },
      },
      required: ['latitude', 'longitude'],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'find_pubs_near_stadium',
    description: 'Find pubs within walking distance of a UK football stadium, usually Premier League grounds.',
    parameters: {
      type: 'object',
      properties: {
        clubOrStadium: { type: 'string', description: 'Club name (Arsenal) or stadium (Emirates Stadium)' },
        radiusMiles: { type: 'number' },
        amenity: { type: 'string', enum: AMENITY_KEYS },
        limit: { type: 'integer' },
      },
      required: ['clubOrStadium'],
      additionalProperties: false,
    },
    strict: false,
  },
]

export async function executePubAssistantTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'search_pubs':
      return searchPubs(args)
    case 'get_pub':
      return getPub(args)
    case 'search_events':
      return searchEvents(args)
    case 'search_news':
      return searchNews(args)
    case 'search_places':
      return searchPlaces(args)
    case 'find_nearby_pubs':
      return findNearbyPubs(args)
    case 'find_pubs_near_stadium':
      return findPubsNearStadium(args)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
