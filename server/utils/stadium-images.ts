import type { PrismaClient } from '@prisma/client'
import { slugifyPlace } from '../../utils/format-venue'

export type StadiumImageRecord = {
  slug: string
  photoUrl: string
  attribution: string | null
}

let allImagesCache: Map<string, StadiumImageRecord> | null = null
let allImagesCacheAt = 0
const ALL_IMAGES_CACHE_MS = 5 * 60 * 1000

export function normalizeStadiumImageSlug(club: string): string {
  return slugifyPlace(club)
}

export function invalidateStadiumImageCache() {
  allImagesCache = null
  allImagesCacheAt = 0
}

async function loadAllStadiumImages(
  prisma: PrismaClient,
  options: { bypassCache?: boolean } = {},
): Promise<Map<string, StadiumImageRecord>> {
  if (
    !options.bypassCache
    && allImagesCache
    && Date.now() - allImagesCacheAt < ALL_IMAGES_CACHE_MS
  ) {
    return allImagesCache
  }

  const rows = await prisma.stadiumImage.findMany()
  const map = new Map<string, StadiumImageRecord>()
  for (const row of rows) {
    const key = normalizeStadiumImageSlug(row.slug)
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

export async function getStadiumImageMap(
  prisma: PrismaClient,
  slugs: string[],
  options: { bypassCache?: boolean } = {},
): Promise<Map<string, StadiumImageRecord>> {
  const all = await loadAllStadiumImages(prisma, options)
  if (!slugs.length) return all

  const wanted = new Set(slugs.map(normalizeStadiumImageSlug))
  const filtered = new Map<string, StadiumImageRecord>()
  for (const slug of wanted) {
    const image = all.get(slug)
    if (image) filtered.set(slug, image)
  }
  return filtered
}

export async function getStadiumImageForSlug(
  prisma: PrismaClient,
  slug: string,
): Promise<StadiumImageRecord | null> {
  const key = normalizeStadiumImageSlug(slug)
  const map = await getStadiumImageMap(prisma, [key])
  return map.get(key) ?? null
}
