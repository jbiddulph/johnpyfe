/**
 * Generate SQL UPDATE statements for Venue.features from Google Places (New) API.
 *
 * Requires GOOGLE_PLACES_API_KEY (Places API enabled in Google Cloud Console).
 *
 * Usage:
 *   node scripts/generate-venue-features-sql.mjs --town Brighton --limit 10 > brighton-features.sql
 *   node scripts/generate-venue-features-sql.mjs --town Brighton --apply   # runs via Prisma (optional)
 *
 * Output is review-first SQL — always check before running on production.
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'

const prisma = new PrismaClient()
const PLACES_SEARCH = 'https://places.googleapis.com/v1/places:searchText'
const SEARCH_FIELD_MASK = 'places.name,places.displayName,places.formattedAddress,places.types'
const DETAILS_FIELD_MASK = [
  'displayName',
  'formattedAddress',
  'types',
  'outdoorSeating',
  'servesVegetarianFood',
  'servesBeer',
  'servesWine',
  'servesBreakfast',
  'servesLunch',
  'servesDinner',
  'servesBrunch',
  'goodForWatchingSports',
  'liveMusic',
  'allowsDogs',
  'accessibilityOptions',
  'editorialSummary',
  'reviewSummary',
].join(',')

function parseArgs(argv) {
  const args = { town: 'Brighton', limit: 20, out: null, dryRun: true }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--town') args.town = argv[++i]
    else if (a === '--limit') args.limit = Number(argv[++i])
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--apply') args.dryRun = false
    else if (a === '--help') {
      console.log('Options: --town NAME --limit N --out file.sql [--apply]')
      process.exit(0)
    }
  }
  return args
}

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''")
}

function localisedText(value) {
  if (value && typeof value === 'object' && 'text' in value) return String(value.text || '').trim() || null
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function buildFallbackDescription(place) {
  const name = localisedText(place.displayName)
  const address = place.formattedAddress?.trim()
  const types = place.types || []
  let kind = 'pub'
  if (types.some((t) => String(t).includes('night_club'))) kind = 'nightclub and bar'
  else if (types.some((t) => String(t).includes('restaurant'))) kind = 'restaurant and pub'
  else if (types.some((t) => String(t).includes('bar'))) kind = 'bar and pub'

  let sentence
  if (name && address) sentence = `${name} is a ${kind} at ${address}.`
  else if (name) sentence = `${name} is a ${kind}.`
  else return null

  const amenities = []
  if (place.outdoorSeating) amenities.push('outdoor seating')
  if (place.allowsDogs) amenities.push('dog-friendly')
  if (place.goodForWatchingSports) amenities.push('sports TV')
  if (place.liveMusic) amenities.push('live music')
  if (['servesBreakfast', 'servesLunch', 'servesDinner', 'servesBrunch'].some((k) => place[k])) {
    amenities.push('food served')
  }
  if (amenities.length) sentence += ` Amenities include ${amenities.join(', ')}.`
  return sentence
}

function buildDescription(place) {
  if (!place) return null
  let text =
    localisedText(place.editorialSummary) ||
    localisedText(place.reviewSummary?.text) ||
    buildFallbackDescription(place)
  if (!text) return null
  if (text.length > 5000) text = `${text.slice(0, 4997)}...`
  return text
}

function buildFeatures(place) {
  const bullets = []
  if (place.outdoorSeating) bullets.push('Beer garden / outdoor seating')
  if (place.allowsDogs) bullets.push('Dog friendly')
  const servesFood = ['servesBreakfast', 'servesLunch', 'servesDinner', 'servesBrunch'].some(
    (k) => place[k],
  )
  if (servesFood) bullets.push('Food served')
  if (place.servesVegetarianFood) bullets.push('Vegetarian options')
  if (place.goodForWatchingSports) bullets.push('Sports bar / sports TV')
  if (place.liveMusic) bullets.push('Live music')
  if (place.servesBeer || (place.types || []).includes('bar')) bullets.push('Bar / pub')
  if (place.servesWine) bullets.push('Wine served')
  if (!bullets.length) bullets.push('Pub (verify amenities locally)')
  return bullets.map((b) => `• ${b}`).join('\n')
}

async function placeDetails(apiKey, placeName) {
  if (!placeName) return null
  const res = await fetch(`https://places.googleapis.com/v1/${placeName}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': DETAILS_FIELD_MASK,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Place Details ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function searchPlace(apiKey, venue) {
  const query = [venue.venuename, venue.address, venue.town, venue.postcode]
    .filter((p) => p && String(p).toUpperCase() !== 'NULL')
    .join(', ')

  const res = await fetch(PLACES_SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, regionCode: 'GB', maxResultCount: 1 }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Places Search ${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json()
  const hit = json.places?.[0]
  if (!hit?.name) return hit ?? null
  return (await placeDetails(apiKey, hit.name)) ?? hit
}

function isBlank(value) {
  return value == null || String(value).trim() === ''
}

function sqlUpdate(venue, features, description) {
  const sets = []
  if (isBlank(venue.features) && features) {
    sets.push(`features = E'${escapeSqlString(features).replace(/\n/g, '\\n')}'`)
  }
  if (isBlank(venue.description) && description) {
    sets.push(`description = E'${escapeSqlString(description).replace(/\n/g, '\\n')}'`)
  }
  if (!sets.length) {
    return `-- SKIP ${venue.venuename} (${venue.postcode}): no blank columns to update`
  }
  sets.push(`updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')`)
  return `-- ${venue.venuename} (${venue.postcode})
UPDATE "Venue"
SET ${sets.join(',\n    ')}
WHERE id = ${venue.id}
  AND town ILIKE '${escapeSqlString(venue.town)}';`
}

async function main() {
  const args = parseArgs(process.argv)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('Set GOOGLE_PLACES_API_KEY (Places API (New) enabled).')
    process.exit(1)
  }

  const venues = await prisma.venue.findMany({
    where: {
      is_live: '1',
      town: { equals: args.town, mode: 'insensitive' },
      OR: [{ features: null }, { features: '' }, { description: null }, { description: '' }],
    },
    orderBy: { venuename: 'asc' },
    take: args.limit,
    select: { id: true, venuename: true, address: true, town: true, postcode: true, features: true, description: true },
  })

  const lines = [
    '-- Generated venue features — review before running',
    `-- Town: ${args.town} | Venues: ${venues.length}`,
    'BEGIN;',
    '',
  ]

  for (const venue of venues) {
    try {
      const place = await searchPlace(apiKey, venue)
      const features = place ? buildFeatures(place) : '• Pub (no online match — verify locally)'
      const description = place ? buildDescription(place) : null
      lines.push(sqlUpdate(venue, features, description), '')
      if (!args.dryRun) {
        const sets = []
        const params = []
        let paramIndex = 1
        if (isBlank(venue.features) && features) {
          sets.push(`features = $${paramIndex++}`)
          params.push(features)
        }
        if (isBlank(venue.description) && description) {
          sets.push(`description = $${paramIndex++}`)
          params.push(description)
        }
        if (sets.length) {
          sets.push(`updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')`)
          params.push(venue.id)
          await prisma.$executeRawUnsafe(
            `UPDATE "Venue" SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
            ...params,
          )
        }
      }
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      lines.push(`-- SKIP id=${venue.id} ${venue.venuename}: ${err.message}`, '')
    }
  }

  lines.push('COMMIT;', '')
  const sql = lines.join('\n')

  if (args.out) writeFileSync(args.out, sql)
  else console.log(sql)

  if (!args.dryRun) console.error(`Applied ${venues.length} updates via Prisma.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
