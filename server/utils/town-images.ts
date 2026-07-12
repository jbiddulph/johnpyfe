import type { PrismaClient } from '@prisma/client'
import { slugifyPlace } from '../../utils/format-venue'

export type TownImageRecord = {
  slug: string
  photoUrl: string
  attribution: string | null
}

let allImagesCache: Map<string, TownImageRecord> | null = null
let allImagesCacheAt = 0
const ALL_IMAGES_CACHE_MS = 5 * 60 * 1000

export function normalizeTownImageSlug(slug: string): string {
  return slugifyPlace(slug)
}

export function invalidateTownImageCache() {
  allImagesCache = null
  allImagesCacheAt = 0
}

async function loadAllTownImages(
  prisma: PrismaClient,
  options: { bypassCache?: boolean } = {},
): Promise<Map<string, TownImageRecord>> {
  if (
    !options.bypassCache
    && allImagesCache
    && Date.now() - allImagesCacheAt < ALL_IMAGES_CACHE_MS
  ) {
    return allImagesCache
  }

  const rows = await prisma.townImage.findMany()
  const map = new Map<string, TownImageRecord>()
  for (const row of rows) {
    const key = normalizeTownImageSlug(row.slug)
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

export async function getTownImageMap(
  prisma: PrismaClient,
  slugs: string[],
  options: { bypassCache?: boolean } = {},
): Promise<Map<string, TownImageRecord>> {
  const all = await loadAllTownImages(prisma, options)
  if (!slugs.length) return all

  const wanted = new Set(slugs.map(normalizeTownImageSlug))
  const filtered = new Map<string, TownImageRecord>()
  for (const slug of wanted) {
    const image = all.get(slug)
    if (image) filtered.set(slug, image)
  }
  return filtered
}

export async function getTownImageForSlug(
  prisma: PrismaClient,
  slug: string,
): Promise<TownImageRecord | null> {
  const key = normalizeTownImageSlug(slug)
  const map = await getTownImageMap(prisma, [key])
  return map.get(key) ?? null
}
