// Netlify Functions v2 entry for Nitro (replaces the Lambda-compatible `netlify` preset entry).
// Lambda compatibility mode caps function env vars at 4KB; v2 functions have no such limit.
// ISR route rules are served via durable CDN cache headers instead of On-demand Builders.
import '#internal/nitro/virtual/polyfill'
import { nitroApp } from '#internal/nitro/app'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'
import { normalizeCookieHeader } from '#internal/nitro/utils'
import { normalizeLambdaOutgoingBody } from '#internal/nitro/utils.lambda'

const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60

function getIsrCacheHeaders(path: string): Record<string, string> {
  const { isr } = getRouteRulesForPath(path) as { isr?: number | boolean }
  if (!isr) return {}
  const maxAge = typeof isr === 'number' ? isr : ONE_YEAR_IN_SECONDS
  const revalidate = typeof isr === 'number' ? `stale-while-revalidate=${ONE_YEAR_IN_SECONDS}` : 'must-revalidate'
  return {
    'cache-control': 'public, max-age=0, must-revalidate',
    'netlify-cdn-cache-control': `public, max-age=${maxAge}, ${revalidate}, durable`,
  }
}

export default async function handler(request: Request, context: unknown) {
  const url = new URL(request.url)
  const method = request.method || 'GET'
  const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase())
  const incomingHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    incomingHeaders[key.toLowerCase()] = value
  })

  const r = await nitroApp.localCall({
    url: url.pathname + url.search,
    method,
    protocol: url.protocol.replace(':', ''),
    headers: incomingHeaders,
    context: { netlify: context },
    body: hasBody ? Buffer.from(await request.arrayBuffer()) : undefined,
  })

  const headers = new Headers()
  for (const [key, value] of Object.entries(r.headers || {})) {
    if (value === undefined || value === null) continue
    if (key.toLowerCase() === 'set-cookie') {
      for (const cookie of normalizeCookieHeader(value as string | string[])) headers.append('set-cookie', cookie)
    } else {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value))
    }
  }

  if (['GET', 'HEAD'].includes(method.toUpperCase())) {
    for (const [key, value] of Object.entries(getIsrCacheHeaders(url.pathname))) {
      if (!headers.has(key)) headers.set(key, value)
    }
  }

  const out = await normalizeLambdaOutgoingBody(r.body, r.headers || {})
  const body = out.type === 'binary' ? Buffer.from(out.body, 'base64') : out.body
  const nullBody = [101, 204, 205, 304].includes(r.status) || method.toUpperCase() === 'HEAD'

  return new Response(nullBody ? null : body, {
    status: r.status,
    statusText: r.statusText,
    headers,
  })
}
