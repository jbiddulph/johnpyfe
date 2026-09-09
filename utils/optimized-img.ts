/** True for Unsplash, Wikimedia, Google Places, and other hotlinked photos. */
export function isRemoteImageSrc(src: string | undefined | null): boolean {
  if (!src) return false
  return /^(https?:)?\/\//i.test(src.trim())
}

/**
 * Nuxt Image `parseSizes` only understands `sm:50vw md:33vw`.
 * CSS media queries and a bare `100vw` become `{ '1px': '100vw' }` and request 1-pixel WebPs.
 */
export function nuxtImageSizes(sizes?: string): string | undefined {
  if (!sizes) return undefined
  const value = sizes.trim()
  if (!value) return undefined
  if (value.includes('min-width') || value.includes('max-width')) return undefined

  const parts = value.split(/[\s,]+/).filter(Boolean)
  const isNuxtSyntax = parts.every((part) => {
    const [breakpoint, size] = part.split(':')
    return Boolean(breakpoint && size && !part.slice(breakpoint.length + 1).includes(':'))
  })

  return isNuxtSyntax ? value : undefined
}
