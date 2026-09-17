const hitsByKey = new Map<string, number[]>()

export function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = 'Too many requests. Please wait a moment and try again.',
) {
  const now = Date.now()
  const recent = (hitsByKey.get(key) || []).filter((time) => now - time < windowMs)
  if (recent.length >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests',
      message,
    })
  }
  recent.push(now)
  hitsByKey.set(key, recent)
}
