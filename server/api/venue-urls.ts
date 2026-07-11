import { getSitemapUrls } from '../utils/sitemap-urls'

/** @deprecated Use /api/sitemap-urls — kept for backwards compatibility */
export default defineEventHandler(() => getSitemapUrls())
