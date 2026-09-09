import { prisma } from '../prisma'
import {
  EMPTY_SITE_SEO_CONFIG,
  SITE_SEO_PAGE_CONFIG_FIELDS,
  isSiteSeoPageKey,
  normaliseSiteSeoSettings,
  type SiteSeoConfig,
  type SiteSeoPageConfigFields,
  type SiteSeoPageKey,
  type SiteSeoSettings,
} from '../../../utils/site-seo-pages'

export const SITE_SEO_SETTING_KEYS = ['includeKeywords', 'excludeKeywords', 'titleSuffix'] as const
export type SiteSeoSettingKey = (typeof SITE_SEO_SETTING_KEYS)[number]

export function isMissingSiteSeoTableError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    message.includes('site_seo_') ||
    message.includes('SiteSeo')
  )
}

function pickConfigFields(row: Record<string, unknown>): SiteSeoPageConfigFields {
  const fields: SiteSeoPageConfigFields = {}
  for (const field of SITE_SEO_PAGE_CONFIG_FIELDS) {
    const value = row[field]
    if (typeof value === 'string' && value.trim()) fields[field] = value.trim()
  }
  return fields
}

export async function loadSiteSeoSettings(): Promise<SiteSeoSettings> {
  const rows = await prisma.siteSeoSetting.findMany()
  const raw: Record<string, unknown> = {}
  for (const row of rows) raw[row.key] = row.value
  return normaliseSiteSeoSettings(raw)
}

export async function loadSiteSeoPageConfigs(): Promise<SiteSeoConfig['pages']> {
  const rows = await prisma.siteSeoPageConfig.findMany()
  const pages: SiteSeoConfig['pages'] = {}
  for (const row of rows) {
    if (!isSiteSeoPageKey(row.pageKey)) continue
    const fields = pickConfigFields(row as unknown as Record<string, unknown>)
    if (Object.keys(fields).length) pages[row.pageKey] = fields
  }
  return pages
}

/** Full approved site SEO config. Returns the empty config when the tables are not migrated yet. */
export async function loadSiteSeoConfig(): Promise<SiteSeoConfig & { migrationReady: boolean }> {
  try {
    const [pages, settings] = await Promise.all([loadSiteSeoPageConfigs(), loadSiteSeoSettings()])
    return { pages, settings, migrationReady: true }
  } catch (error) {
    if (!isMissingSiteSeoTableError(error)) throw error
    return { ...EMPTY_SITE_SEO_CONFIG, migrationReady: false }
  }
}

export async function getSiteSeoPageConfig(pageKey: SiteSeoPageKey): Promise<SiteSeoPageConfigFields> {
  const row = await prisma.siteSeoPageConfig.findUnique({ where: { pageKey } })
  return row ? pickConfigFields(row as unknown as Record<string, unknown>) : {}
}

/**
 * Merge the supplied fields into a page config. `null` clears a field, `undefined`
 * leaves it untouched. Removes the row when nothing is left.
 */
export async function writeSiteSeoPageConfig(
  pageKey: SiteSeoPageKey,
  fields: Partial<Record<keyof SiteSeoPageConfigFields, string | null | undefined>>,
) {
  const current = await getSiteSeoPageConfig(pageKey)
  const next: Record<string, string | null> = {}
  for (const field of SITE_SEO_PAGE_CONFIG_FIELDS) {
    const incoming = fields[field]
    if (incoming === undefined) {
      next[field] = current[field] ?? null
    } else {
      const value = incoming === null ? '' : String(incoming).trim()
      next[field] = value ? value : null
    }
  }

  const hasAny = Object.values(next).some((value) => value !== null)
  if (!hasAny) {
    await prisma.siteSeoPageConfig.deleteMany({ where: { pageKey } })
    return {}
  }

  const row = await prisma.siteSeoPageConfig.upsert({
    where: { pageKey },
    create: { pageKey, ...next },
    update: next,
  })
  return pickConfigFields(row as unknown as Record<string, unknown>)
}

export async function deleteSiteSeoPageConfig(pageKey: SiteSeoPageKey) {
  await prisma.siteSeoPageConfig.deleteMany({ where: { pageKey } })
}

export async function writeSiteSeoSettings(
  settings: Partial<Record<SiteSeoSettingKey, unknown>>,
): Promise<SiteSeoSettings> {
  for (const key of SITE_SEO_SETTING_KEYS) {
    const value = settings[key]
    if (value === undefined) continue
    if (value === null || (Array.isArray(value) && value.length === 0) || value === '') {
      await prisma.siteSeoSetting.deleteMany({ where: { key } })
      continue
    }
    await prisma.siteSeoSetting.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    })
  }
  return loadSiteSeoSettings()
}
