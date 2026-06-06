/**
 * Fetch and cache Google Places photos for all UK county hub cards.
 *
 * Requires GOOGLE_PLACES_API_KEY and DATABASE_URL in .env
 * Run the county_images migration first.
 *
 * Usage:
 *   npx tsx scripts/enrich_county_images.ts
 *   npx tsx scripts/enrich_county_images.ts --limit 5
 */

import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { refreshAllCountyImages } from '../server/utils/county-images'
import { listCountySlugs } from '../server/utils/place-hub'

loadEnv()

function parseArgs(argv: string[]) {
  const args = { limit: null as number | null, delay: 250 }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--limit') args.limit = Number(argv[++i])
    else if (a === '--delay') args.delay = Number(argv[++i])
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('Set GOOGLE_PLACES_API_KEY in .env')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    let counties = await listCountySlugs()
    if (args.limit) counties = counties.slice(0, args.limit)

    console.log(`Fetching images for ${counties.length} counties…`)
    const result = await refreshAllCountyImages(prisma, counties, apiKey, args.delay)
    console.log(`Done. Updated ${result.updated}, skipped ${result.skipped}, total ${result.total}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
