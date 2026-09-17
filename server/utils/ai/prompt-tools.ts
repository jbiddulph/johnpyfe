import type { Prisma } from '@prisma/client'
import { MAP_FEATURE_FLAGS } from '../../../utils/map-filters'
import { cleanDbString, formatPlaceName, slugifyPlace } from '../../../utils/format-venue'
import type {
  AiPromptEvent,
  AiPromptNews,
  AiPromptPlace,
  AiPromptStadium,
  AiPromptVenue,
} from '../../../types/ai-prompt'
import { prisma } from '../prisma'
import { upcomingEventWhere } from '../event-list'
import { runSiteSearch } from '../site-search'
import {
  findNearbyVenues,
  findVenuesNearPoint,
  NEARBY_VENUE_RADIUS_MILES,
  venueCoordsForNearby,
} from '../venue-nearby'

const LIVE_VENUE: Prisma.VenueWhereInput = {
  is_live: '1',
  slug: { not: '' },
}

const FEATURE_KEYWORDS: Record<string, string[]> = {
  garden: ['garden', 'outdoor', 'terrace', 'courtyard'],
  dogs: ['dog'],
  music: ['live music', 'live band', 'karaoke', 'open mic'],
  food: ['food', 'kitchen', 'sunday roast', 'restaurant'],
  sport: ['sport', 'sky sport', 'football', 'big screen'],
  ale: ['real ale', 'cask', 'craft beer', 'camra'],
  family: ['family', 'child', 'kids'],
  wifi: ['wifi', 'wi-fi'],
  parking: ['parking', 'car park'],
  accessible: ['wheelchair', 'accessible', 'step free'],
  quiz: ['quiz'],
  rooms: ['accommodation', 'b&b', 'hotel', 'rooms'],
}

export const PROMPT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    name: 'search_venues',
    description:
      'Search live UK pub and venue listings by name, town, county, venue type, or amenity (dog friendly, live music, beer garden, food, sport, real ale, family, wifi, parking, quiz, rooms). Use this whenever the user asks about pubs or bars.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Pub or venue name, or free-text keywords' },
        town: { type: 'string', description: 'Town or city name, e.g. Brighton' },
        county: { type: 'string', description: 'UK county name' },
        feature: {
          type: 'string',
          description: 'Amenity such as dogs, music, garden, food, sport, ale, family, wifi, parking, quiz, rooms',
        },
        venuetype: { type: 'string', description: 'Venue type such as pub, bar, club' },
        limit: { type: 'integer', description: 'Max results, default 8, max 12' },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'get_venue',
    description: 'Fetch one pub or venue by id, or by name (optionally with town) when the user asks about a specific listing.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        venueId: { type: 'integer', description: 'Numeric venue id' },
        name: { type: 'string', description: 'Venue name' },
        town: { type: 'string', description: 'Optional town to disambiguate' },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'search_events',
    description: 'Search upcoming events at pubs and venues (gigs, quizzes, comedy, sport). Prefer this for “what’s on” questions.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Event title or keywords' },
        town: { type: 'string', description: 'Town or city name' },
        category: { type: 'string', description: 'Category name such as music, comedy, quiz' },
        limit: { type: 'integer', description: 'Max results, default 8, max 12' },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'search_places',
    description: 'Find town and county hub pages that match a place name.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Town or county name' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    name: 'search_news',
    description: 'Search UK pub and bar news articles, or list the latest stories when query is omitted.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Keywords in the title or excerpt' },
        limit: { type: 'integer', description: 'Max results, default 5, max 8' },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'find_nearby_pubs',
    description:
      'Find pubs near a known venue, a town centre, or a Premier League stadium. Use for “near me” style questions when a place or stadium is named.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        venueId: { type: 'integer', description: 'Centre on this venue id' },
        venueName: { type: 'string', description: 'Centre on a venue with this name' },
        town: { type: 'string', description: 'Town to search within or centre on' },
        stadium: { type: 'string', description: 'Club or stadium name, e.g. Old Trafford' },
        radiusMiles: { type: 'number', description: 'Straight-line radius in miles, default 1, max 5' },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'search_stadiums',
    description: 'Look up Premier League stadiums and how many pubs sit within a mile.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Club or stadium name' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    name: 'get_site_overview',
    description: 'High-level counts of live pubs, upcoming events, news, and the busiest towns. Use for “how many pubs” or site overview questions.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
] as const

export type PromptToolName = (typeof PROMPT_TOOL_DEFINITIONS)[number]['name']

function clampLimit(value: unknown, fallback: number, max: number) {
  const n = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(1, n))
}

function venueHref(id: number, slug: string) {
  return `/venues/${id}/${encodeURIComponent(slug || '')}`
}

function truncate(value: unknown, max = 220) {
  const text = cleanDbString(value)
  if (!text) return undefined
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

function toVenueCard(venue: {
  id: number
  slug: string
  venuename: string
  town: string
  county?: string | null
  address?: string | null
  postcode?: string | null
  venuetype?: string | null
  features?: string | null
}): AiPromptVenue {
  return {
    id: venue.id,
    slug: venue.slug,
    venuename: venue.venuename,
    town: formatPlaceName(venue.town) || venue.town,
    county: formatPlaceName(venue.county) || String(venue.county || ''),
    address: cleanDbString(venue.address) || '',
    postcode: cleanDbString(venue.postcode) || '',
    href: venueHref(venue.id, venue.slug),
    venuetype: cleanDbString(venue.venuetype) || undefined,
    featuresPreview: truncate(venue.features, 160),
  }
}

export class PromptResultCollector {
  venues = new Map<number, AiPromptVenue>()
  events = new Map<number, AiPromptEvent>()
  places = new Map<string, AiPromptPlace>()
  news = new Map<string, AiPromptNews>()
  stadiums = new Map<string, AiPromptStadium>()
  toolsCalled: string[] = []

  noteTool(name: string) {
    if (!this.toolsCalled.includes(name)) this.toolsCalled.push(name)
  }

  addVenue(venue: AiPromptVenue) {
    if (!this.venues.has(venue.id)) this.venues.set(venue.id, venue)
  }

  addEvent(event: AiPromptEvent) {
    if (!this.events.has(event.id)) this.events.set(event.id, event)
  }

  addPlace(place: AiPromptPlace) {
    if (!this.places.has(place.href)) this.places.set(place.href, place)
  }

  addNews(article: AiPromptNews) {
    if (!this.news.has(article.slug)) this.news.set(article.slug, article)
  }

  addStadium(stadium: AiPromptStadium) {
    if (!this.stadiums.has(stadium.href)) this.stadiums.set(stadium.href, stadium)
  }

  snapshot() {
    return {
      venues: [...this.venues.values()].slice(0, 12),
      events: [...this.events.values()].slice(0, 12),
      places: [...this.places.values()].slice(0, 8),
      news: [...this.news.values()].slice(0, 6),
      stadiums: [...this.stadiums.values()].slice(0, 6),
      toolsCalled: [...this.toolsCalled],
    }
  }
}

function featureTerms(feature: unknown): string[] {
  const raw = String(feature || '').trim().toLowerCase()
  if (!raw) return []
  const flag = MAP_FEATURE_FLAGS.find(
    (item) =>
      item.key === raw
      || item.label.toLowerCase() === raw
      || item.label.toLowerCase().includes(raw)
      || raw.includes(item.key),
  )
  if (flag) return FEATURE_KEYWORDS[flag.key] || [flag.key]
  return [raw]
}

function textSearch(field: 'features' | 'description' | 'venuename' | 'venuetype', terms: string[]): Prisma.VenueWhereInput[] {
  return terms.map((term) => ({
    [field]: { contains: term, mode: 'insensitive' as const },
  }))
}

const venueCardSelect = {
  id: true,
  slug: true,
  venuename: true,
  address: true,
  town: true,
  county: true,
  postcode: true,
  venuetype: true,
  features: true,
} as const

async function searchVenues(args: Record<string, unknown>, collector: PromptResultCollector) {
  const query = String(args.query || '').trim()
  const town = String(args.town || '').trim()
  const county = String(args.county || '').trim()
  const venuetype = String(args.venuetype || '').trim()
  const feature = featureTerms(args.feature)
  const limit = clampLimit(args.limit, 8, 12)

  const and: Prisma.VenueWhereInput[] = [{ ...LIVE_VENUE }]
  if (town) and.push({ town: { contains: town, mode: 'insensitive' } })
  if (county) and.push({ county: { contains: county, mode: 'insensitive' } })
  if (venuetype) and.push({ venuetype: { contains: venuetype, mode: 'insensitive' } })
  if (query) {
    and.push({
      OR: [
        { venuename: { contains: query, mode: 'insensitive' } },
        { town: { contains: query, mode: 'insensitive' } },
        { county: { contains: query, mode: 'insensitive' } },
        { features: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    })
  }
  if (feature.length) {
    and.push({
      OR: [
        ...textSearch('features', feature),
        ...textSearch('description', feature),
      ],
    })
  }

  if (and.length === 1 && !query) {
    return { total: 0, venues: [] as AiPromptVenue[], note: 'Provide a query, town, county, or feature.' }
  }

  const where: Prisma.VenueWhereInput = { AND: and }
  const [items, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      select: venueCardSelect,
      orderBy: { venuename: 'asc' },
      take: limit,
    }),
    prisma.venue.count({ where }),
  ])

  const venues = items.map((venue) => {
    const card = toVenueCard(venue)
    collector.addVenue(card)
    return card
  })

  return { total, venues }
}

async function getVenue(args: Record<string, unknown>, collector: PromptResultCollector) {
  const venueId = Number.parseInt(String(args.venueId ?? ''), 10)
  const name = String(args.name || '').trim()
  const town = String(args.town || '').trim()

  const venue = Number.isFinite(venueId)
    ? await prisma.venue.findFirst({
        where: { id: venueId, ...LIVE_VENUE },
        select: {
          ...venueCardSelect,
          telephone: true,
          website: true,
          description: true,
          latitude: true,
          longitude: true,
        },
      })
    : name
      ? await prisma.venue.findFirst({
          where: {
            ...LIVE_VENUE,
            venuename: { contains: name, mode: 'insensitive' },
            ...(town ? { town: { contains: town, mode: 'insensitive' } } : {}),
          },
          select: {
            ...venueCardSelect,
            telephone: true,
            website: true,
            description: true,
            latitude: true,
            longitude: true,
          },
        })
      : null

  if (!venue) return { venue: null }

  const [review, upcoming] = await Promise.all([
    prisma.ukpubsReview.aggregate({
      where: { venueId: venue.id },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.event.count({
      where: {
        listingId: venue.id,
        ...upcomingEventWhere(),
      },
    }),
  ])

  const card = toVenueCard(venue)
  collector.addVenue(card)

  return {
    venue: {
      ...card,
      telephone: cleanDbString(venue.telephone),
      website: cleanDbString(venue.website),
      description: truncate(venue.description, 400),
      hasCoords: Boolean(venueCoordsForNearby(venue)),
      reviewCount: review._count,
      averageRating: review._avg.rating ? Number(review._avg.rating.toFixed(1)) : null,
      upcomingEvents: upcoming,
    },
  }
}

async function searchEvents(args: Record<string, unknown>, collector: PromptResultCollector) {
  const query = String(args.query || '').trim()
  const town = String(args.town || '').trim()
  const category = String(args.category || '').trim()
  const limit = clampLimit(args.limit, 8, 12)

  const and: Prisma.EventWhereInput[] = [
    upcomingEventWhere(),
    { listing: { is: LIVE_VENUE } },
  ]
  if (query) {
    and.push({
      OR: [
        { event_title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { listing: { is: { venuename: { contains: query, mode: 'insensitive' } } } },
      ],
    })
  }
  if (town) {
    and.push({
      OR: [
        { city: { is: { name: { contains: town, mode: 'insensitive' } } } },
        { listing: { is: { town: { contains: town, mode: 'insensitive' } } } },
      ],
    })
  }
  if (category) {
    and.push({ category: { is: { name: { contains: category, mode: 'insensitive' } } } })
  }

  const where: Prisma.EventWhereInput = { AND: and }

  const items = await prisma.event.findMany({
    where,
    include: {
      city: { select: { name: true, slug: true } },
      category: { select: { name: true } },
      listing: { select: { id: true, slug: true, venuename: true, town: true } },
    },
    orderBy: [{ event_start: 'asc' }, { id: 'asc' }],
    take: limit,
  })

  const events = items.map((item) => {
    const card: AiPromptEvent = {
      id: item.id,
      title: item.event_title,
      startsAt: item.event_start.toISOString(),
      venueName: item.listing.venuename,
      town: formatPlaceName(item.city?.name || item.listing.town) || item.listing.town,
      category: item.category?.name || '',
      href: `/events/${item.id}`,
      venueHref: venueHref(item.listing.id, item.listing.slug),
    }
    collector.addEvent(card)
    collector.addVenue(
      toVenueCard({
        id: item.listing.id,
        slug: item.listing.slug,
        venuename: item.listing.venuename,
        town: item.listing.town,
        county: '',
        address: '',
        postcode: '',
      }),
    )
    return card
  })

  return { total: events.length, events }
}

async function searchPlaces(args: Record<string, unknown>, collector: PromptResultCollector) {
  const query = String(args.query || '').trim()
  if (query.length < 2) return { towns: [], counties: [] }

  const results = await runSiteSearch(query, 0, 6)
  const towns = results.towns.map((town) => {
    const place: AiPromptPlace = {
      kind: 'town',
      name: town.displayName,
      href: town.href,
      venueCount: town.venueCount,
    }
    collector.addPlace(place)
    return place
  })
  const counties = results.counties.map((county) => {
    const place: AiPromptPlace = {
      kind: 'county',
      name: county.displayName,
      href: county.href,
      venueCount: county.venueCount,
    }
    collector.addPlace(place)
    return place
  })
  for (const venue of results.venues.items) {
    collector.addVenue(toVenueCard({
      id: venue.id,
      slug: venue.slug,
      venuename: venue.venuename,
      town: venue.town,
      county: '',
      address: venue.address,
      postcode: venue.postcode,
    }))
  }
  return { towns, counties }
}

async function searchNews(args: Record<string, unknown>, collector: PromptResultCollector) {
  const query = String(args.query || '').trim()
  const limit = clampLimit(args.limit, 5, 8)
  const items = await prisma.ukpubsNews.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
    },
  })
  const news = items.map((item) => {
    const card: AiPromptNews = {
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      href: `/news/${item.slug}`,
      publishedAt: item.publishedAt.toISOString(),
    }
    collector.addNews(card)
    return card
  })
  return { news }
}

async function searchStadiums(args: Record<string, unknown>, collector: PromptResultCollector) {
  const query = String(args.query || '').trim()
  if (!query) return { stadiums: [] }

  const stadiums = await prisma.stadium.findMany({
    where: {
      OR: [
        { club: { contains: query, mode: 'insensitive' } },
        { stadium_name: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { club: 'asc' },
    take: 8,
  })

  return {
    stadiums: stadiums.map((stadium) => {
      const slug = slugifyPlace(stadium.club)
      const card: AiPromptStadium = {
        club: stadium.club,
        stadiumName: stadium.stadium_name,
        href: `/pubs-near-stadiums/${slug}`,
      }
      collector.addStadium(card)
      return {
        ...card,
        latitude: Number(stadium.latitude),
        longitude: Number(stadium.longitude),
      }
    }),
  }
}

async function findNearbyPubs(args: Record<string, unknown>, collector: PromptResultCollector) {
  const radiusMiles = Math.min(5, Math.max(0.5, Number(args.radiusMiles) || NEARBY_VENUE_RADIUS_MILES))
  const venueId = Number.parseInt(String(args.venueId ?? ''), 10)
  const venueName = String(args.venueName || '').trim()
  const town = String(args.town || '').trim()
  const stadiumQuery = String(args.stadium || '').trim()

  if (stadiumQuery) {
    const stadiums = await prisma.stadium.findMany({
      where: {
        OR: [
          { club: { contains: stadiumQuery, mode: 'insensitive' } },
          { stadium_name: { contains: stadiumQuery, mode: 'insensitive' } },
        ],
      },
      take: 1,
    })
    const stadium = stadiums[0]
    if (!stadium) return { venues: [], note: 'No matching stadium.' }
    const lat = Number(stadium.latitude)
    const lon = Number(stadium.longitude)
    const slug = slugifyPlace(stadium.club)
    collector.addStadium({
      club: stadium.club,
      stadiumName: stadium.stadium_name,
      href: `/pubs-near-stadiums/${slug}`,
    })
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { venues: [], note: 'Stadium coordinates missing.' }
    const nearby = await findVenuesNearPoint(prisma, lat, lon, radiusMiles, 12)
    const venues = nearby.map((row) => {
      const card = toVenueCard(row)
      collector.addVenue(card)
      return { ...card, distanceMiles: row.distanceMiles }
    })
    return {
      centre: { type: 'stadium', name: stadium.stadium_name, club: stadium.club, href: `/pubs-near-stadiums/${slug}` },
      radiusMiles,
      venues,
    }
  }

  let centre = Number.isFinite(venueId)
    ? await prisma.venue.findFirst({
        where: { id: venueId, ...LIVE_VENUE },
        select: { id: true, slug: true, venuename: true, town: true, county: true, address: true, postcode: true, venuetype: true, features: true, latitude: true, longitude: true },
      })
    : null

  if (!centre && venueName) {
    centre = await prisma.venue.findFirst({
      where: {
        ...LIVE_VENUE,
        venuename: { contains: venueName, mode: 'insensitive' },
        ...(town ? { town: { contains: town, mode: 'insensitive' } } : {}),
      },
      select: { id: true, slug: true, venuename: true, town: true, county: true, address: true, postcode: true, venuetype: true, features: true, latitude: true, longitude: true },
    })
  }

  if (!centre && town) {
    centre = await prisma.venue.findFirst({
      where: {
        ...LIVE_VENUE,
        town: { contains: town, mode: 'insensitive' },
        latitude: { not: '' },
        longitude: { not: '' },
      },
      select: { id: true, slug: true, venuename: true, town: true, county: true, address: true, postcode: true, venuetype: true, features: true, latitude: true, longitude: true },
    })
  }

  if (!centre) return { venues: [], note: 'Need a venue, town, or stadium to search nearby.' }

  const coords = venueCoordsForNearby(centre)
  collector.addVenue(toVenueCard(centre))
  if (!coords) {
    return { centre: toVenueCard(centre), venues: [], note: 'That listing has no map coordinates.' }
  }

  const nearby = await findNearbyVenues(prisma, centre.id, coords.lat, coords.lon, radiusMiles)
  const venues = nearby.map((row) => {
    const card = toVenueCard(row)
    collector.addVenue(card)
    return { ...card, distanceMiles: row.distanceMiles }
  })

  return {
    centre: toVenueCard(centre),
    radiusMiles,
    venues,
  }
}

async function getSiteOverview() {
  const [venueCount, eventCount, newsCount, townRows] = await Promise.all([
    prisma.venue.count({ where: LIVE_VENUE }),
    prisma.event.count({ where: upcomingEventWhere() }),
    prisma.ukpubsNews.count(),
    prisma.venue.groupBy({
      by: ['town'],
      where: LIVE_VENUE,
      _count: { _all: true },
      orderBy: { _count: { town: 'desc' } },
      take: 8,
    }),
  ])

  return {
    liveVenues: venueCount,
    upcomingEvents: eventCount,
    newsArticles: newsCount,
    busiestTowns: townRows.map((row) => ({
      town: formatPlaceName(row.town) || row.town,
      venueCount: row._count._all,
      href: `/town/${slugifyPlace(row.town)}`,
    })),
  }
}

export async function executePromptTool(
  name: string,
  args: Record<string, unknown>,
  collector: PromptResultCollector,
) {
  collector.noteTool(name)
  switch (name) {
    case 'search_venues':
      return searchVenues(args, collector)
    case 'get_venue':
      return getVenue(args, collector)
    case 'search_events':
      return searchEvents(args, collector)
    case 'search_places':
      return searchPlaces(args, collector)
    case 'search_news':
      return searchNews(args, collector)
    case 'find_nearby_pubs':
      return findNearbyPubs(args, collector)
    case 'search_stadiums':
      return searchStadiums(args, collector)
    case 'get_site_overview':
      return getSiteOverview()
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export function suggestedQueriesFromResults(
  prompt: string,
  snapshot: ReturnType<PromptResultCollector['snapshot']>,
): string[] {
  const suggestions: string[] = []
  const town = snapshot.places.find((place) => place.kind === 'town')
  const venue = snapshot.venues[0]
  const stadium = snapshot.stadiums[0]
  if (town) suggestions.push(`What's on in ${town.name}?`)
  if (venue) suggestions.push(`Pubs near ${venue.venuename}`)
  if (stadium) suggestions.push(`Pubs near ${stadium.stadiumName}`)
  if (!suggestions.includes('Dog-friendly pubs in Brighton')) suggestions.push('Dog-friendly pubs in Brighton')
  if (!suggestions.includes('Latest pub news')) suggestions.push('Latest pub news')
  return [...new Set(suggestions)].filter((item) => item.toLowerCase() !== prompt.trim().toLowerCase()).slice(0, 4)
}

export function composeFallbackAnswer(
  prompt: string,
  snapshot: ReturnType<PromptResultCollector['snapshot']>,
): string {
  const parts: string[] = []
  if (snapshot.places.length) {
    parts.push(
      `Place matches: ${snapshot.places
        .slice(0, 4)
        .map((place) => `${place.name} (${place.kind}${place.venueCount ? `, ${place.venueCount} pubs` : ''})`)
        .join('; ')}.`,
    )
  }
  if (snapshot.venues.length) {
    parts.push(
      `Here are some matching pubs: ${snapshot.venues
        .slice(0, 5)
        .map((venue) => `${venue.venuename} in ${venue.town}`)
        .join('; ')}.`,
    )
  }
  if (snapshot.events.length) {
    parts.push(
      `Upcoming events: ${snapshot.events
        .slice(0, 4)
        .map((event) => `${event.title} at ${event.venueName}`)
        .join('; ')}.`,
    )
  }
  if (snapshot.news.length) {
    parts.push(`Related news: ${snapshot.news.slice(0, 3).map((item) => item.title).join('; ')}.`)
  }
  if (snapshot.stadiums.length) {
    parts.push(
      `Stadium pages: ${snapshot.stadiums
        .slice(0, 3)
        .map((item) => `${item.stadiumName} (${item.club})`)
        .join('; ')}.`,
    )
  }
  if (!parts.length) {
    return `I couldn't find a listing that matches “${prompt.trim()}”. Try a town, a pub name, or browse the map and counties pages.`
  }
  return parts.join(' ')
}
