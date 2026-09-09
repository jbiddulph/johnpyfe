import {
  EMPTY_SITE_SEO_CONFIG,
  normaliseSiteSeoSettings,
  renderSeoTemplate,
  type SiteSeoConfig,
  type SiteSeoPageConfigFields,
  type SiteSeoPageKey,
} from '../utils/site-seo-pages'

/**
 * Approved site-wide SEO overrides written by the AI SEO agent (after admin
 * approval). Loaded once per request in app.vue and shared through useState.
 */
export function useSiteSeoConfig() {
  return useState<SiteSeoConfig>('site-seo-config', () => EMPTY_SITE_SEO_CONFIG)
}

export async function loadSiteSeoConfigIntoState() {
  const state = useSiteSeoConfig()
  const requestFetch = useRequestFetch()
  await useAsyncData('site-seo-config', async () => {
    try {
      const data = await requestFetch<{ pages?: SiteSeoConfig['pages']; settings?: Record<string, unknown> }>(
        '/api/seo/site-config',
      )
      state.value = {
        pages: data?.pages ?? {},
        settings: normaliseSiteSeoSettings(data?.settings ?? null),
      }
    } catch (error) {
      console.warn('[site-seo] could not load site SEO config', (error as Error).message)
    }
    return true
  })
  return state
}

export function useSiteSeoPageConfig(key: SiteSeoPageKey) {
  const config = useSiteSeoConfig()
  return computed<SiteSeoPageConfigFields>(() => config.value.pages[key] ?? {})
}

/** Approved intro copy for a page type, rendered with the supplied placeholders. */
export function useSiteSeoIntro(
  key: SiteSeoPageKey,
  vars?: Record<string, unknown> | (() => Record<string, unknown>),
) {
  const page = useSiteSeoPageConfig(key)
  return computed(() => {
    const template = page.value.introText
    if (!template) return ''
    const values = typeof vars === 'function' ? vars() : vars ?? {}
    return renderSeoTemplate(template, values)
  })
}

/** Rendered link title / image alt from approved templates, falling back to the default. */
export function useSiteSeoTemplateText(
  key: SiteSeoPageKey,
  field: 'linkTitleTemplate' | 'imageAltTemplate',
  vars: () => Record<string, unknown>,
  fallback: () => string,
) {
  const page = useSiteSeoPageConfig(key)
  return computed(() => {
    const template = page.value[field]
    if (template) {
      const rendered = renderSeoTemplate(template, vars())
      if (rendered) return rendered
    }
    return fallback()
  })
}

export function useSiteTitleSuffix() {
  const config = useSiteSeoConfig()
  return computed(() => config.value.settings.titleSuffix || 'UK Pubs')
}
