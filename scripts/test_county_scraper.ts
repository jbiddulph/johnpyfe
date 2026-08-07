/**
 * Test the county image scraper without database
 * 
 * This script demonstrates the scraping functionality by fetching
 * images for a few UK counties and displaying the results.
 * 
 * Usage:
 *   npx tsx scripts/test_county_scraper.ts
 */

import { fetchCountyImageFromWeb, delay } from '../server/utils/county-scraper'

const TEST_COUNTIES = [
  'Devon',
  'Cornwall',
  'Yorkshire',
  'Kent',
  'Sussex'
]

async function main() {
  console.log('\n🔍 Testing County Image Scraper\n')
  console.log(`Fetching images for ${TEST_COUNTIES.length} counties from Wikipedia/Wikimedia Commons...\n`)
  
  let successful = 0
  let failed = 0
  
  for (const countyName of TEST_COUNTIES) {
    console.log(`\n📍 ${countyName}`)
    console.log('  Searching...')
    
    try {
      const result = await fetchCountyImageFromWeb(countyName)
      
      if (result) {
        console.log(`  ✅ Found image!`)
        console.log(`  📸 URL: ${result.photoUrl.substring(0, 80)}${result.photoUrl.length > 80 ? '...' : ''}`)
        console.log(`  📝 Attribution: ${result.attribution || 'None'}`)
        successful++
      } else {
        console.log(`  ❌ No image found`)
        failed++
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }
    
    // Delay between requests
    if (TEST_COUNTIES.indexOf(countyName) < TEST_COUNTIES.length - 1) {
      await delay(1500)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Results:')
  console.log(`   ✅ Successful: ${successful}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Success Rate: ${Math.round((successful / TEST_COUNTIES.length) * 100)}%`)
  console.log('='.repeat(60) + '\n')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
