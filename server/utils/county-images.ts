import type { PrismaClient } from '@prisma/client'
import { delay, fetchCountyPhotoFromPlaces } from './county-places'
import { canonicalCountySlug, findCanonicalCountyBySlug } from './uk-counties'

export type CountyImageRecord = {
  slug: string
  photoUrl: string
  attribution: string | null
}

const MAX_FETCH_PER_REQUEST = 4

/** Normalise county hub slugs for county_images lookups (e.g. East Sussex → east-sussex). */
export function normalizeCountyImageSlug(slug: string): string {
  const fromCanonical = findCanonicalCountyBySlug(slug)
  if (fromCanonical) {
    return canonicalCountySlug(fromCanonical) || slug.trim().toLowerCase()
  }
  return slug
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

let allImagesCache: Map<string, CountyImageRecord> | null = null
let allImagesCacheAt = 0
const ALL_IMAGES_CACHE_MS = 5 * 60 * 1000

async function loadAllCountyImages(prisma: PrismaClient): Promise<Map<string, CountyImageRecord>> {
  if (allImagesCache && Date.now() - allImagesCacheAt < ALL_IMAGES_CACHE_MS) {
    return allImagesCache
  }

  const rows = await prisma.countyImage.findMany()
  const map = new Map<string, CountyImageRecord>()
  for (const row of rows) {
    const key = normalizeCountyImageSlug(row.slug)
    map.set(key, {
      slug: key,
      photoUrl: row.photoUrl,
      attribution: row.attribution,
    })
  }
  allImagesCache = map
  allImagesCacheAt = Date.now()
  return map
}

export async function getCountyImageMap(
  prisma: PrismaClient,
  slugs: string[],
): Promise<Map<string, CountyImageRecord>> {
  const all = await loadAllCountyImages(prisma)
  if (!slugs.length) return all

  const wanted = new Set(slugs.map(normalizeCountyImageSlug))
  const filtered = new Map<string, CountyImageRecord>()
  for (const slug of wanted) {
    const image = all.get(slug)
    if (image) filtered.set(slug, image)
  }
  return filtered
}

export async function getCountyImageForSlug(
  prisma: PrismaClient,
  slug: string,
): Promise<CountyImageRecord | null> {
  const key = normalizeCountyImageSlug(slug)
  const map = await getCountyImageMap(prisma, [key])
  return map.get(key) ?? null
}

export async function cacheCountyImage(
  prisma: PrismaClient,
  slug: string,
  photoUrl: string,
  attribution: string | null,
) {
  const normalizedSlug = normalizeCountyImageSlug(slug)
  await prisma.countyImage.upsert({
    where: { slug: normalizedSlug },
    create: { slug: normalizedSlug, photoUrl, attribution },
    update: { photoUrl, attribution },
  })
  allImagesCache = null
}

/** Attach cached images; lazily fetch a few missing counties when API key is configured. */
export async function enrichCountiesWithImages<
  T extends { slug: string; displayName: string },
>(prisma: PrismaClient, counties: T[], apiKey: string | undefined) {
  const slugs = counties.map((county) => normalizeCountyImageSlug(county.slug))
  const imageMap = await getCountyImageMap(prisma, slugs)

  const missing = counties.filter(
    (county) => !imageMap.has(normalizeCountyImageSlug(county.slug)),
  )
  if (apiKey && missing.length) {
    const batch = missing.slice(0, MAX_FETCH_PER_REQUEST)
    for (const county of batch) {
      try {
        const result = await fetchCountyPhotoFromPlaces(county.displayName, apiKey)
        if (result) {
          await cacheCountyImage(prisma, county.slug, result.photoUrl, result.attribution)
          const key = normalizeCountyImageSlug(county.slug)
          imageMap.set(key, {
            slug: key,
            photoUrl: result.photoUrl,
            attribution: result.attribution,
          })
        }
      } catch (error) {
        console.error(`[county-images] failed for ${county.slug}:`, error)
      }
      await delay(200)
    }
  }

  return counties.map((county) => {
    const key = normalizeCountyImageSlug(county.slug)
    const image = imageMap.get(key)
    return {
      ...county,
      slug: key,
      imageUrl: image?.photoUrl ?? null,
      imageAttribution: image?.attribution ?? null,
    }
  })
}

/** Populate or refresh all county images (for scripts). */
export async function refreshAllCountyImages(
  prisma: PrismaClient,
  counties: Array<{ slug: string; displayName: string }>,
  apiKey: string,
  delayMs = 250,
) {
  let updated = 0
  let skipped = 0

  for (const county of counties) {
    try {
      const result = await fetchCountyPhotoFromPlaces(county.displayName, apiKey)
      if (!result) {
        skipped++
        console.warn(`No photo found for ${county.displayName} (${county.slug})`)
      } else {
        await cacheCountyImage(prisma, county.slug, result.photoUrl, result.attribution)
        updated++
        console.log(`Cached image for ${county.displayName}`)
      }
    } catch (error) {
      skipped++
      console.error(`Failed for ${county.displayName}:`, error)
    }
    await delay(delayMs)
  }

  return { updated, skipped, total: counties.length }
}
