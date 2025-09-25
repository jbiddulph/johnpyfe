// Server-side performance middleware
export default defineEventHandler(async (event) => {
  // Add performance headers to all responses
  setHeader(event, 'X-DNS-Prefetch-Control', 'on')
  setHeader(event, 'X-XSS-Protection', '1; mode=block')
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Referrer-Policy', 'origin-when-cross-origin')
  
  // Enable compression for text-based responses
  const acceptEncoding = getHeader(event, 'accept-encoding') || ''
  if (acceptEncoding.includes('gzip')) {
    setHeader(event, 'Content-Encoding', 'gzip')
  }
  
  // Cache static assets
  if (event.node.req.url?.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  }
  
  // Cache API responses for a short time
  if (event.node.req.url?.startsWith('/api/')) {
    setHeader(event, 'Cache-Control', 'public, max-age=300') // 5 minutes
  }
  
  // Add performance timing
  const start = Date.now()
  
  // Process the request
  const result = await $fetch(event.node.req.url, {
    baseURL: event.node.req.url,
    headers: getHeaders(event)
  }).catch(() => null)
  
  const duration = Date.now() - start
  setHeader(event, 'X-Response-Time', `${duration}ms`)
  
  return result
})
