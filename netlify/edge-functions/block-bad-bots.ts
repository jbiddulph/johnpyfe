// Runs on Netlify's Deno edge runtime; typed structurally so the repo doesn't need
// @netlify/edge-functions installed just for its type declarations.
type EdgeContext = { next: () => Promise<Response> }

/**
 * Reject crawlers that are disallowed in robots.txt but ignore it, before the request
 * reaches the CDN cache or the SSR function. A 403 from the edge costs one edge
 * invocation and ~0 bytes, versus 20–150KB of HTML per crawled page otherwise.
 *
 * Match on the exact product tokens these bots send. Googlebot, Bingbot, DuckDuckBot,
 * Applebot (search) and social preview fetchers are deliberately not listed.
 */
const BLOCKED_USER_AGENTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Bytespider',
  'PetalBot',
  'Amazonbot',
  'GPTBot',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'CCBot',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'meta-externalagent',
  'PerplexityBot',
  'Timpibot',
].map((token) => token.toLowerCase())

export default async (request: Request, context: EdgeContext) => {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase()
  if (!userAgent) return context.next()

  if (BLOCKED_USER_AGENTS.some((token) => userAgent.includes(token))) {
    return new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  return context.next()
}

export const config = {
  path: '/*',
  // Hashed assets, fonts and images are only requested after a page load; skipping
  // them keeps edge invocations (and cost) to roughly one per page view.
  excludedPath: ['/_nuxt/*', '/_fonts/*', '/assets/*', '/.netlify/*', '/favicon*', '/*.png', '/*.svg', '/*.webmanifest'],
}
