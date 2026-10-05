/**
 * Unit checks: venue title/meta/keywords from site templates must not be treated
 * as missing, and the agent must not write per-venue overrides by default.
 *
 * Run: npx tsx scripts/test-seo-template-respect.ts
 */
import assert from 'node:assert/strict'
import {
  resolveEffectiveVenueSeo,
  sanitizeSeoChangesAgainstTemplates,
  shouldProposeTemplatedSeoOverrides,
} from '../server/utils/ai/seo-agent'
import type { PubSeoData } from '../server/utils/ai/seo-types'

function baseVenue(overrides: Partial<PubSeoData> = {}): PubSeoData {
  return {
    venueId: 1,
    name: 'The Crown',
    venueType: 'Pub',
    address: '1 High Street',
    town: 'Brighton',
    county: 'East Sussex',
    postcode: 'BN1 1AA',
    location: 'Brighton, East Sussex, BN1 1AA',
    description: 'A short pub blurb.',
    facilities: ['Garden'],
    openingHours: null,
    images: [],
    pageTitle: 'The Crown, Brighton',
    metaDescription: 'Visit The Crown in Brighton, East Sussex.',
    seoKeywords: ['The Crown', 'Brighton', 'pub'],
    seoSources: {
      pageTitle: 'site_template',
      metaDescription: 'site_template',
      seoKeywords: 'site_template',
    },
    hasCustomListingSeo: false,
    website: null,
    nearbyAreas: ['Brighton'],
    nearbyLandmarks: [],
    isClaimed: false,
    gsc: null,
    ...overrides,
  }
}

function testResolveUsesSiteTemplate() {
  const resolved = resolveEffectiveVenueSeo({
    name: 'The Crown',
    town: 'Brighton',
    county: 'East Sussex',
    postcode: 'BN1 1AA',
    venueType: 'Pub',
    profilePageTitle: null,
    profileMetaDescription: null,
    profileSeoKeywords: [],
    titleTemplate: '{venue} pub in {town}',
    descriptionTemplate: 'Discover {venue}, a {venueType} in {town}, {county}.',
    keywordsTemplate: '{venue}, {town} pub, {county}',
    includeKeywords: ['UK pubs'],
    excludeKeywords: [],
    titleSuffix: 'UK Pubs',
  })

  assert.equal(resolved.pageTitle, 'The Crown pub in Brighton')
  assert.match(resolved.metaDescription || '', /Discover The Crown/)
  assert.equal(resolved.seoSources.pageTitle, 'site_template')
  assert.equal(resolved.seoSources.metaDescription, 'site_template')
  assert.equal(resolved.seoSources.seoKeywords, 'site_template')
  assert.equal(resolved.hasCustomListingSeo, false)
  assert.ok(resolved.seoKeywords.includes('UK pubs'))
}

function testResolvePrefersProfileOverrides() {
  const resolved = resolveEffectiveVenueSeo({
    name: 'The Crown',
    town: 'Brighton',
    county: 'East Sussex',
    postcode: 'BN1 1AA',
    venueType: 'Pub',
    profilePageTitle: 'Custom Crown Title',
    profileMetaDescription: 'Custom meta for The Crown.',
    profileSeoKeywords: ['custom keyword'],
    titleTemplate: '{venue} pub in {town}',
    descriptionTemplate: 'Discover {venue}',
    keywordsTemplate: '{venue}, template keyword',
    includeKeywords: [],
    excludeKeywords: [],
    titleSuffix: null,
  })

  assert.equal(resolved.pageTitle, 'Custom Crown Title')
  assert.equal(resolved.metaDescription, 'Custom meta for The Crown.')
  assert.deepEqual(resolved.seoKeywords, ['custom keyword'])
  assert.equal(resolved.hasCustomListingSeo, true)
  assert.equal(resolved.seoSources.pageTitle, 'profile')
}

function testSanitizeDropsTemplatedFieldsByDefault() {
  const data = baseVenue()
  assert.equal(shouldProposeTemplatedSeoOverrides(data), false)

  const sanitized = sanitizeSeoChangesAgainstTemplates(data, {
    pageTitle: 'Override title',
    metaDescription: 'Override meta',
    description: 'A much longer on-page description for visitors and search.',
    seoKeywords: ['override', 'keywords'],
    missingContentWarnings: [
      'SEO page title is missing',
      'Pub description is missing or too short',
    ],
    sourceNotes: ['test'],
  })

  assert.equal(sanitized.pageTitle, undefined)
  assert.equal(sanitized.metaDescription, undefined)
  assert.equal(sanitized.seoKeywords, undefined)
  assert.equal(sanitized.description, 'A much longer on-page description for visitors and search.')
  assert.deepEqual(sanitized.missingContentWarnings, ['Pub description is missing or too short'])
  assert.ok(
    sanitized.sourceNotes?.some((note) => note.includes('site-wide venue SEO templates')),
  )
}

function testSanitizeKeepsOverridesForGscCtrGap() {
  const data = baseVenue({
    gsc: {
      pageUrl: 'https://ukpubs.co.uk/venues/1/the-crown',
      clicks: 2,
      impressions: 400,
      ctr: 0.005,
      position: 8,
      expectedCtr: 0.03,
      ctrGap: 0.025,
      opportunityScore: 12,
      reason: 'CTR below expected for position',
      topQueries: [],
    },
  })
  assert.equal(shouldProposeTemplatedSeoOverrides(data), true)

  const sanitized = sanitizeSeoChangesAgainstTemplates(data, {
    pageTitle: 'The Crown Brighton | Real Ale',
    metaDescription: 'Plan a visit to The Crown in Brighton.',
    seoKeywords: ['should', 'drop'],
    description: 'Body copy',
  })

  assert.equal(sanitized.pageTitle, 'The Crown Brighton | Real Ale')
  assert.equal(sanitized.metaDescription, 'Plan a visit to The Crown in Brighton.')
  assert.equal(sanitized.seoKeywords, undefined)
}

function main() {
  testResolveUsesSiteTemplate()
  testResolvePrefersProfileOverrides()
  testSanitizeDropsTemplatedFieldsByDefault()
  testSanitizeKeepsOverridesForGscCtrGap()
  console.log('test-seo-template-respect: all checks passed')
}

main()
