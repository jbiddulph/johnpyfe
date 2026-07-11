import type { Prisma } from '@prisma/client'

/** Upcoming events: soonest first. */
export const UPCOMING_EVENT_ORDER: Prisma.EventOrderByWithRelationInput[] = [
  { event_start: 'asc' },
  { id: 'asc' },
]

export function upcomingEventWhere(now = new Date()): Prisma.EventWhereInput {
  return { event_start: { gt: now } }
}

export const UPCOMING_EVENT_INCLUDE = {
  city: true,
  category: true,
  listing: true,
} as const
