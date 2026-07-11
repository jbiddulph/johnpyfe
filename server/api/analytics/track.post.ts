import { prisma } from '../../utils/prisma'
import { recordAnalyticsEvent } from '../../utils/analytics'

/** Record a page view, share click, or outbound link event. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const eventType = String(body?.eventType || 'pageview').trim()
  const path = String(body?.path || '').trim()
  const label = body?.label != null ? String(body.label) : null
  const referrer = body?.referrer != null ? String(body.referrer) : getHeader(event, 'referer') || null

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Path is required' })
  }

  try {
    return await recordAnalyticsEvent(prisma, {
      eventType: eventType as 'pageview' | 'share' | 'outbound',
      path,
      label,
      referrer,
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('[api/analytics/track] failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to record analytics event' })
  }
})
