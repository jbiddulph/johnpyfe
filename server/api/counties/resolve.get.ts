import { resolveCounty } from '../../utils/place-hub'

export default defineEventHandler(async (event) => {
  const { county } = getQuery(event)
  const countyName = String(county || '').trim()
  if (!countyName) {
    throw createError({ statusCode: 400, statusMessage: 'county query required' })
  }

  const resolved = await resolveCounty(countyName)
  if (!resolved) {
    return { slug: null, name: null, href: null }
  }

  return {
    slug: resolved.slug,
    name: resolved.displayName,
    href: resolved.href,
  }
})
