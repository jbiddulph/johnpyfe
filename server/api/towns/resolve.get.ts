import { resolveTown } from '../../utils/place-hub'

export default defineEventHandler(async (event) => {
  const { town } = getQuery(event)
  const townName = String(town || '').trim()
  if (!townName) {
    throw createError({ statusCode: 400, statusMessage: 'town query required' })
  }

  const resolved = await resolveTown(townName)
  if (!resolved) {
    return { slug: null, name: null, href: null }
  }

  return {
    slug: resolved.slug,
    name: resolved.displayName,
    href: resolved.href,
  }
})
