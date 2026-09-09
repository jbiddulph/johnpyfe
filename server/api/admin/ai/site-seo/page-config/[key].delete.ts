import { requireAdmin } from '../../../../../utils/require-admin'
import { isSiteSeoPageKey } from '../../../../../../utils/site-seo-pages'
import { removeSiteSeoPageOverride } from '../../../../../utils/ai/site-seo-audit'

/** Remove every approved override for a page type, restoring the built-in copy. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = String(getRouterParam(event, 'key') || '').trim()
  if (!isSiteSeoPageKey(key)) throw createError({ statusCode: 400, statusMessage: 'Unknown page key' })
  await removeSiteSeoPageOverride(key)
  return { removed: key }
})
