import { formatPlaceName } from './format-venue'

export const SITE_BRAND = 'UK Pubs'

const SMALL_TITLE_WORDS = new Set(['in', 'and', 'or', 'the', 'a', 'an', 'of', 'near', 'for', 'at', 'by'])

/** Append "| UK Pubs" unless the title already includes the brand. */
export function siteSeoTitle(headline: string): string {
  const trimmed = headline.trim()
  if (!trimmed) return SITE_BRAND
  if (trimmed.toLowerCase().includes(`| ${SITE_BRAND.toLowerCase()}`)) return trimmed
  return `${trimmed} | ${SITE_BRAND}`
}

/** Title-case a search phrase, keeping small words lowercase after the first word. */
export function formatSearchHeadline(query: string): string {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''

  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && SMALL_TITLE_WORDS.has(lower)) return lower
      return lower.replace(/\b\w/g, (char) => char.toUpperCase())
    })
    .join(' ')
}

export function venueSeoHeadline(venuename: string, town: string): string {
  const name = formatPlaceName(venuename)
  const place = formatPlaceName(town)
  if (name && place) return `${name}, ${place}`
  return name || place || 'Pub'
}

export function venueSeoDescription(venuename: string, town: string, county: string): string {
  const name = formatPlaceName(venuename)
  const place = formatPlaceName(town)
  const region = formatPlaceName(county)
  const location = [place, region].filter(Boolean).join(', ')
  if (name && location) {
    return `Visit ${name} in ${location}. Find events, menus, opening details and more for this pub on ${SITE_BRAND}.`
  }
  if (name) {
    return `Visit ${name}. Find events, menus and pub details on ${SITE_BRAND}.`
  }
  return `Pub and venue details, events and listings on ${SITE_BRAND}.`
}

export function venueSeoKeywords(venuename: string, town: string, county: string): string {
  const parts = [
    formatPlaceName(venuename),
    formatPlaceName(town),
    formatPlaceName(county),
    'pub',
    'bar',
    SITE_BRAND,
  ].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

/**
 * SEO alt text for venue photos: "{Venue} pub, {Town}, {County}".
 * Skips a duplicate "pub" when the venue name already ends with pub/bar/inn/tavern.
 */
export function venueImageAlt(venuename: string, town?: string, county?: string): string {
  const name = formatPlaceName(venuename) || 'Pub'
  const place = formatPlaceName(town)
  const region = formatPlaceName(county)
  const alreadyTyped = /\b(pub|bar|inn|tavern|hotel|club)\s*$/i.test(name)
  const subject = alreadyTyped ? name : `${name} pub`
  return [subject, place, region].filter(Boolean).join(', ')
}

export function townSeoHeadline(town: string, county?: string): string {
  const place = formatPlaceName(town)
  const region = formatPlaceName(county)
  if (place && region) return `Pubs in ${place}, ${region}`
  if (place) return `Pubs in ${place}`
  return 'Pubs'
}

export function townSeoDescription(town: string, county?: string): string {
  const place = formatPlaceName(town)
  const region = formatPlaceName(county)
  const location = [place, region].filter(Boolean).join(', ')
  if (location) {
    return `Browse pubs and venues in ${location}. Discover events, live music, beer gardens and local bars on ${SITE_BRAND}.`
  }
  return `Browse pubs and venues. Discover events, live music and local bars on ${SITE_BRAND}.`
}

export function townSeoKeywords(town: string, county?: string): string {
  const place = formatPlaceName(town)
  const region = formatPlaceName(county)
  const parts = [
    place ? `pubs in ${place}` : '',
    place ? `${place} pubs` : '',
    region ? `${region} pubs` : '',
    'UK pubs',
    'pubs',
    'bars',
  ].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

export function countySeoHeadline(county: string): string {
  const region = formatPlaceName(county)
  return region ? `Pubs in ${region}` : 'Pubs'
}

export function countySeoDescription(county: string): string {
  const region = formatPlaceName(county)
  if (region) {
    return `Find pubs and venues across ${region}. Browse by town, see upcoming events and discover great local bars on ${SITE_BRAND}.`
  }
  return `Find pubs and venues across the UK on ${SITE_BRAND}.`
}

export function countySeoKeywords(county: string): string {
  const region = formatPlaceName(county)
  const parts = [
    region ? `pubs in ${region}` : '',
    region ? `${region} pubs` : '',
    'UK pubs',
    'pubs',
    'bars',
  ].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

export function searchSeoHeadline(query: string): string {
  const trimmed = query.trim()
  if (trimmed.length < 2) return 'Search Pubs, Towns & Counties'
  return formatSearchHeadline(trimmed)
}

export function searchSeoDescription(query: string): string {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return `Search pubs, towns and counties across the UK. Find venues, events and local bars on ${SITE_BRAND}.`
  }
  const headline = formatSearchHeadline(trimmed)
  return `Search results for ${headline.toLowerCase()}. Find matching pubs, venues and places across the UK on ${SITE_BRAND}.`
}

export function searchSeoKeywords(query: string): string {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return `search pubs, UK pubs, pub finder, towns, counties`
  }
  const headline = formatSearchHeadline(trimmed)
  return `${headline}, UK pubs, pubs, venues, search`
}
