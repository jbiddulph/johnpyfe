import type { PrismaClient } from '@prisma/client'
import { delay, fetchCountyPhotoFromPlaces } from './county-places'

export type CountyImageRecord = {
  slug: string
  photoUrl: string
  attribution: string | null
}

const MAX_FETCH_PER_REQUEST = 4

export async function getCountyImageMap(
  prisma: PrismaClient,
  slugs: string[],
): Promise<Map<string, CountyImageRecord>> {
  if (!slugs.length) return new Map()

  const rows = await prisma.countyImage.findMany({
    where: { slug: { in: slugs } },
  })

  return new Map(
    rows.map((row) => [
      row.slug,
      {
        slug: row.slug,
        photoUrl: row.photoUrl,
        attribution: row.attribution,
      },
    ]),
  )
}

export async function cacheCountyImage(
  prisma: PrismaClient,
  slug: string,
  photoUrl: string,
  attribution: string | null,
) {
  await prisma.countyImage.upsert({
    where: { slug },
    create: { slug, photoUrl, attribution },
    update: { photoUrl, attribution },
  })
}

/** Attach cached images; lazily fetch a few missing counties when API key is configured. */
export async function enrichCountiesWithImages<
  T extends { slug: string; displayName: string },
>(prisma: PrismaClient, counties: T[], apiKey: string | undefined) {
  const slugs = counties.map((county) => county.slug)
  const imageMap = await getCountyImageMap(prisma, slugs)

  const missing = counties.filter((county) => !imageMap.has(county.slug))
  if (apiKey && missing.length) {
    const batch = missing.slice(0, MAX_FETCH_PER_REQUEST)
    for (const county of batch) {
      try {
        const result = await fetchCountyPhotoFromPlaces(county.displayName, apiKey)
        if (result) {
          await cacheCountyImage(prisma, county.slug, result.photoUrl, result.attribution)
          imageMap.set(county.slug, {
            slug: county.slug,
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
    const image = imageMap.get(county.slug)
    return {
      ...county,
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
