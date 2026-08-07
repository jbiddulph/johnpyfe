/**
 * Fetch and cache county images from web scraping (Wikipedia/Wikimedia Commons)
 * 
 * This script scrapes images without requiring the Google Places API.
 *
 * Requires DATABASE_URL in .env
 * Run the county_images migration first.
 *
 * Usage:
 *   npx tsx scripts/scrape_county_images.ts
 *   npx tsx scripts/scrape_county_images.ts --limit 5
 *   npx tsx scripts/scrape_county_images.ts --delay 1500
 */

import { PrismaClient } from '@prisma/client'
import { refreshAllCountyImagesFromWeb } from '../server/utils/county-images'
import { listCountySlugs } from '../server/utils/place-hub'

function parseArgs(argv: string[]) {
  const args = { limit: null as number | null, delay: 1000 }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--limit') args.limit = Number(argv[++i])
    else if (a === '--delay') args.delay = Number(argv[++i])
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)

  const prisma = new PrismaClient()
  try {
    let counties = await listCountySlugs()
    if (args.limit) counties = counties.slice(0, args.limit)

    console.log(`\nScraping images for ${counties.length} counties from Wikipedia/Wikimedia Commons...\n`)
    const result = await refreshAllCountyImagesFromWeb(prisma, counties, args.delay)
    console.log(`\n✓ Done! Updated ${result.updated}, skipped ${result.skipped}, total ${result.total}.\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
