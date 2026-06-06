import { prisma } from '../../utils/prisma'
import {
  UPCOMING_EVENT_INCLUDE,
  UPCOMING_EVENT_ORDER,
  upcomingEventWhere,
} from '../../utils/event-list'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = Math.max(0, Number.parseInt(String(query.skip ?? 0), 10) || 0)
  const take = Math.min(
    500,
    Math.max(1, Number.parseInt(String(query.take ?? 104), 10) || 104),
  )

  try {
    const where = upcomingEventWhere()

    const [items, total] = await Promise.all([
      prisma.event.findMany({
        skip,
        take,
        where,
        include: UPCOMING_EVENT_INCLUDE,
        orderBy: UPCOMING_EVENT_ORDER,
      }),
      prisma.event.count({ where }),
    ])

    return {
      items,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    }
  } catch (error) {
    console.error('Error fetching events:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch events',
    })
  }
})
