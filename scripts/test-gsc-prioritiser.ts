/**
 * Offline checks for GSC URL parsing and opportunity scoring.
 * Run: npx tsx scripts/test-gsc-prioritiser.ts
 */
import {
  expectedCtrForPosition,
  pathFromGscPageUrl,
  scoreGscOpportunity,
  venueIdFromPath,
} from '../server/utils/ai/gsc-prioritiser'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

assert(pathFromGscPageUrl('https://ukpubs.co.uk/venues/123/the-red-lion') === '/venues/123/the-red-lion', 'path parse')
assert(venueIdFromPath('/venues/123/the-red-lion') === 123, 'venue id parse')
assert(venueIdFromPath('/town/brighton') === null, 'non-venue path')

const lowCtr = scoreGscOpportunity({ clicks: 5, impressions: 500, ctr: 0.01, position: 4 })
assert(lowCtr.ctrGap > 0, 'ctr gap expected')
assert(lowCtr.opportunityScore > 0, 'score expected')

const weak = scoreGscOpportunity({ clicks: 0, impressions: 10, ctr: 0, position: 50 })
const strong = scoreGscOpportunity({ clicks: 10, impressions: 800, ctr: 0.012, position: 6 })
assert(strong.opportunityScore > weak.opportunityScore, 'strong opportunity ranks higher')

assert(expectedCtrForPosition(1) > expectedCtrForPosition(10), 'ctr curve decreases')

console.log('gsc-prioritiser checks passed')
