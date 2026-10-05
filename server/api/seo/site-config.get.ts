import { loadSiteSeoConfig } from '../../utils/ai/site-seo-config'

/**
 * Approved site-wide SEO overrides (page title/description templates, intro copy,
 * keyword strategy). Read by the app on SSR, so Nitro-cache the Prisma lookups.
 */
export default defineCachedEventHandler(
  async (event) => {
    setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    try {
      const { pages, settings } = await loadSiteSeoConfig()
      return { pages, settings }
    } catch (error) {
      console.warn('[api/seo/site-config] failed, serving empty config:', (error as Error).message)
      return { pages: {}, settings: { includeKeywords: [], excludeKeywords: [], titleSuffix: null } }
    }
  },
  {
    maxAge: 300,
    swr: true,
    name: 'seo-site-config',
    getKey: () => 'default',
  },
)
