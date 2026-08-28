import { prisma } from './prisma'
import { getProfilesByUserIds } from './crawl-profiles'
import type { ReviewSummary, SerializedReview } from '../../types/venue-social'

export type { ReviewAuthor, ReviewSummary, SerializedReview, VenueReviewsPayload } from '../../types/venue-social'

export const REVIEW_COMMENT_MAX = 2000
export const REVIEW_LIST_LIMIT = 50

export const favoriteVenueSelect = {
  id: true,
  venuename: true,
  slug: true,
  town: true,
  county: true,
  address: true,
  postcode: true,
  photo: true,
  website: true,
} as const

export function parseVenueId(raw: string | string[] | undefined): number {
  const venueId = Number.parseInt(String(Array.isArray(raw) ? raw[0] : raw), 10)
  if (!Number.isFinite(venueId) || venueId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }
  return venueId
}

export async function requireVenue(venueId: number) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true },
  })
  if (!venue) {
    throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
  }
  return venue
}

export function parseRating(value: unknown): number {
  const rating = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Rating must be a whole number from 1 to 5' })
  }
  return rating
}

export function parseComment(value: unknown): string {
  const comment = typeof value === 'string' ? value.trim() : ''
  if (comment.length > REVIEW_COMMENT_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Comment must be ${REVIEW_COMMENT_MAX} characters or fewer`,
    })
  }
  return comment
}

function emptyRatingCounts(): ReviewSummary['ratingCounts'] {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

export async function getReviewSummary(venueId: number): Promise<ReviewSummary> {
  const [aggregate, grouped] = await Promise.all([
    prisma.ukpubsReview.aggregate({
      where: { venueId },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.ukpubsReview.groupBy({
      by: ['rating'],
      where: { venueId },
      _count: { rating: true },
    }),
  ])

  const ratingCounts = emptyRatingCounts()
  for (const row of grouped) {
    const key = row.rating as 1 | 2 | 3 | 4 | 5
    if (key >= 1 && key <= 5) {
      ratingCounts[key] = row._count.rating
    }
  }

  const count = aggregate._count
  const average = count > 0 && aggregate._avg.rating != null
    ? Math.round(aggregate._avg.rating * 10) / 10
    : null

  return { average, count, ratingCounts }
}

export async function serializeReviews(
  rows: Array<{
    id: string
    userId: string
    venueId: number
    rating: number
    comment: string
    createdAt: Date
    updatedAt: Date
  }>,
): Promise<SerializedReview[]> {
  const profiles = await getProfilesByUserIds(rows.map((row) => row.userId))
  return rows.map((row) => {
    const profile = profiles.get(row.userId)
    return {
      id: row.id,
      userId: row.userId,
      venueId: row.venueId,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: {
        displayName: profile?.displayName || 'UK Pubs member',
        username: profile?.username || null,
      },
    }
  })
}

export async function getVenueReviewsPayload(venueId: number, userId?: string | null) {
  const [summary, rows, myReviewRow, favorite] = await Promise.all([
    getReviewSummary(venueId),
    prisma.ukpubsReview.findMany({
      where: { venueId },
      orderBy: { createdAt: 'desc' },
      take: REVIEW_LIST_LIMIT,
    }),
    userId
      ? prisma.ukpubsReview.findUnique({
          where: { userId_venueId: { userId, venueId } },
        })
      : Promise.resolve(null),
    userId
      ? prisma.ukpubsFavorite.findUnique({
          where: { userId_venueId: { userId, venueId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  const reviews = await serializeReviews(rows)
  const mySerialized = myReviewRow ? (await serializeReviews([myReviewRow]))[0] : null

  return {
    summary,
    reviews,
    myReview: mySerialized,
    isFavorite: userId ? Boolean(favorite) : null,
  }
}
